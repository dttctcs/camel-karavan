import { Button, Drawer, DrawerContent, DrawerContentBody } from "@patternfly/react-core";
import React, { useEffect, useMemo, useCallback, useRef, useId, useState } from "react";
import { RefsPanel } from "./RefPanel";
import { RefCard, RefCardProps } from "./RefCard";
import vscode from "../vscodeapi";

const MOCKED_REFS: { rahlaRef: RahlaRef }[] = [
    {
        rahlaRef: {
            id: "1",
            interface: "Dummy interface 1",
            filter: "This is the filter for Dummy interface 1."
        }
    },
    {
        rahlaRef: {
            id: "2",
            interface: "Dummy interface 2",
            filter: "This is the filter for Dummy interface 2."
        }
    },
    {
        rahlaRef: {
            id: "3",
            interface: "Dummy interface 3",
            filter: "This is the filter for Dummy interface 3."
        }
    },
    {
        rahlaRef: {
            id: "4",
            interface: "Dummy interface 4",
            filter: "This is the filter for Dummy interface 4."
        }
    },
    {
        rahlaRef: {
            id: "5",
            interface: "Dummy interface 5",
            filter: "This is the filter for Dummy interface 5."
        }
    }
]

export type PanelState = { id: string | undefined, ref: Partial<RahlaRef> }

const INIT_REF_STATE = { id: undefined, ref: {} };
//@ts-ignore
console.log(vscode);
export function RefsDesigner() {
    const [selectedRef, setSelectedRef] = useState<PanelState>(INIT_REF_STATE);
    const [selectedFilePath, setSelectedFilePAth] = useState('');
    const [refs, setRefs] = useState<RahlaRef[]>([])

    const submitRef = useCallback(() => {
        console.log('----Submitting ref----');
        console.log(selectedRef);
        console.log('----Submitting ref----');
        vscode.postMessage({ command: 'setRef', ref: selectedRef })
    }, [selectedRef]);

    const deleteRef = useCallback((refId: string) => {
        console.log('----Deleting ref----');
        console.log(refId);
        console.log('----Deleting ref----');
        vscode.postMessage({ command: 'deleteRef', refId })
    }, [])

    const handleRefClick = useCallback((r: RahlaRef) => {
        console.log('Setting Ref', r);
        setSelectedRef({ id: r.id, ref: r });
    }, []);

    const handleOnMessage = (ev: any) => {
        const { data } = ev;
        if (data.target === 'refs') { // avoid collision with any similar logic that might be implemented later somewhere else.
            switch (data.command) {
                case 'selectionPath':
                    setSelectedFilePAth(data.payload)
                    break;
                case 'allRefs':
                    console.log('receiving refs!', data.payload)
                    setRefs(extractFromYamlObjectByStepName(data.payload, 'reference'))
                    break;
                default:
                    console.log('UNKNOWN COMMAND', data.command)
            }
        }
    }

    useEffect(() => {
        window && window.addEventListener('message', handleOnMessage);
        return () => window.removeEventListener('message', handleOnMessage);
    }, [])

    /**
     * this useEffect contains all messages that must be posted to the ext api when refs tab is mounted.
     */
    useEffect(() => {
        console.log('selection path is', selectedFilePath)
        if (!selectedFilePath)
            vscode.postMessage({ command: 'getSelectedFile' }); // get the path of the selected yaml file.
        vscode.postMessage({ command: 'getRefs' }); // get all refs in the yaml file.
    }, [selectedFilePath])


    return <>
        <Drawer isExpanded isInline>
            <DrawerContent panelContent={<RefsPanel
                refId={selectedRef.id}
                activeRef={selectedRef.ref}
                setter={setSelectedRef}
                onSubmit={submitRef}
                deleteHandler={deleteRef}
            />}>
                <DrawerContentBody>
                    <Button
                        style={{ marginTop: 10, marginInline: 'auto' }}
                        variant="primary"
                        onClick={() => setSelectedRef(INIT_REF_STATE)}>
                        New Reference
                    </Button>
                    {refs.map(r => <RefCard
                        key={r.id}
                        onClick={handleRefClick}
                        isSelected={selectedRef.id === r.id}
                        rahlaRef={r}
                    />)}
                </DrawerContentBody>
            </DrawerContent>
        </Drawer>
    </>;
}


function extractFromYamlObjectByStepName(yamlObject: any, stepName: string): RahlaRef[] {
    let result: any[] = []
    // @ts-ignore
    if (Array.isArray(yamlObject)) yamlObject.forEach(o => stepName in o ? result.push(o[stepName] as Map<string, string>) : null)
    // @ts-ignore
    else Object.keys(yamlObject).forEach(k => k === stepName ? result.push(yamlObject[k]) : null)
    return result;
}

/**
 * Represents the reference properties used in rahla's xml
 */
export interface RahlaRef {
    id: string;
    interface: string;
    filter: string;
}
type YamlLeaf = Map<string, string | YamlLeaf | YamlLeaf[]> | YamlLeaf[];

