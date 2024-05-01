import { ActionGroup, Button, DrawerHead, DrawerPanelBody, DrawerPanelContent, Form, FormGroup, TextInput } from "@patternfly/react-core";
import React, { useCallback, useEffect } from "react";
import { PanelState, RahlaRef } from "./RefsDesigner";

export interface RefsPanelProps {
    setter: React.Dispatch<React.SetStateAction<PanelState>>,
    onSubmit?: () => void;
    activeRef: Partial<RahlaRef>;
    refId: string | undefined;
    deleteHandler: (refId: string) => void
}
export const RefsPanel = ({ setter, onSubmit, activeRef, refId, deleteHandler }: RefsPanelProps) => {

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
                    <ActionGroup style={{display:'flex',flexDirection:'row',justifyContent:'space-evenly'}}>
                        <Button type="submit" variant="primary" >Submit</Button>
                        {refId ? <Button
                            style={{ color: 'white' }}
                            type="button"
                            variant="danger"
                            onClick={() => deleteHandler(refId)}
                        >Delete</Button> : null}
                    </ActionGroup>
                </Form>
            </DrawerPanelBody>
        </DrawerPanelContent>
    </>;
}