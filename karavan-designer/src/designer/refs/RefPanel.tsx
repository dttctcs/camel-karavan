import { ActionGroup, Button, DrawerHead, DrawerPanelBody, DrawerPanelContent, Form, FormGroup, TextInput } from "@patternfly/react-core";
import React, { useCallback, useEffect } from "react";
import { PanelState, RahlaRef } from "./RefsDesigner";

export interface RefsPanelProps {
    setter: React.Dispatch<React.SetStateAction<PanelState>>,
    onSubmit?: () => void;
    activeRef: Partial<RahlaRef>;
    refId: string | undefined
}
export const RefsPanel = ({ setter, onSubmit, activeRef, refId }: RefsPanelProps) => {

    const handleInputChange = useCallback((name: string, value: string) => {
        setter(r => ({ id: r.id, ref: { ...r.ref, [name]: value } }))
    }, [])

    return <>
        <DrawerPanelContent>
            <DrawerHead>
                <h1 style={{ fontSize: '2rem' }}>Reference data</h1>
                <h2 style={{ fontSize: '1.3rem' }}>{refId ? `Editing reference Id: ${refId}` : `Creating a new reference`}</h2>
            </DrawerHead>
            <DrawerPanelBody>
                <Form onSubmit={e => { e.preventDefault(); if (onSubmit) onSubmit() }}>
                    <FormGroup label="id">
                        <TextInput id="id" value={activeRef.id ?? ''} onChange={(e, v) => handleInputChange('id', v)} type="text" />
                    </FormGroup>
                    <FormGroup label="interface">
                        <TextInput id="interface" value={activeRef.interface ?? ''} onChange={(e, v) => handleInputChange('interface', v)} type="text" />
                    </FormGroup>
                    <FormGroup label="filter">
                        <TextInput id="filter" value={activeRef.filter ?? ''} onChange={(e, v) => handleInputChange('filter', v)} type="text" />
                    </FormGroup>
                    <ActionGroup>
                        <Button type="submit" variant="primary" >Submit</Button>
                    </ActionGroup>
                </Form>
            </DrawerPanelBody>
        </DrawerPanelContent>
    </>;
}