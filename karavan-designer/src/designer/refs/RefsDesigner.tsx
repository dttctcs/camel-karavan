import { Button, Drawer, DrawerContent, DrawerContentBody } from "@patternfly/react-core";
import React, { useEffect, useMemo, useCallback, useRef, useId, useState } from "react";
import { RefsPanel } from "./RefPanel";
import { RefCard, RefCardProps } from "./RefCard";

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

export function RefsDesigner() {
    const [selectedRef, setSelectedRef] = useState<PanelState>(INIT_REF_STATE);

    const submitRef = useCallback(() => {
        console.log('----Submitting ref----');
        console.log(selectedRef);
        console.log('----Submitting ref----');
    }, [selectedRef])

    const handleRefClick = useCallback((r: RahlaRef) => {
        console.log('Setting Ref', r);
        setSelectedRef({ id: r.id, ref: r });
    }, [])

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