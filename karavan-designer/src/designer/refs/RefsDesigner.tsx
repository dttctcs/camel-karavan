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
    const submitRef = useCallback(() => {
        console.log('----Submitting ref----');
        console.log(selectedRef);
        console.log('----Submitting ref----');
    }, [selectedRef])

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
                    console.log(data.payload)
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
            />}>
                <DrawerContentBody>
                    {MOCKED_REFS.map(r => <RefCard
                        key={r.rahlaRef.id}
                        onClick={handleRefClick}
                        isSelected={selectedRef.id === r.rahlaRef.id}
                        {...r}
                    />)}
                    <Button
                        style={{ marginTop: 10, marginInline: 'auto' }}
                        variant="primary"
                        onClick={() => setSelectedRef(INIT_REF_STATE)}>
                        New Reference
                    </Button>
                </DrawerContentBody>
            </DrawerContent>
        </Drawer>
    </>;
}

/**
 * Represents the reference properties used in rahla's xml
 */
export interface RahlaRef {
    id: string;
    interface: string;
    filter: string;
}


