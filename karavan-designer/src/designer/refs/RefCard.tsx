
import React, { useCallback } from "react";
import { RahlaRef } from "./RefsDesigner";
import { Card, CardBody, CardHeader, CardTitle, Flex, FlexItem } from "@patternfly/react-core";

export interface RefCardProps {
    rahlaRef: RahlaRef,
    onClick?: (r: RahlaRef) => void,
    isSelected: boolean
}

export const RefCard = ({ rahlaRef, onClick, isSelected }: RefCardProps) => {
    return <>
        <Card
            style={{
                backgroundColor: isSelected ? '#0d0d0d' : undefined,
                cursor: 'pointer',
                borderColor: '#0099e6',
                borderStyle: 'ridge',
                borderWidth: isSelected ? 1 : 0
            }}
            onClick={() => { onClick && onClick(rahlaRef) }}
        >
            <CardHeader>
                <CardTitle>Ref</CardTitle>
            </CardHeader>
            <CardBody>
                <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
                    {Object.keys(rahlaRef).map((k, i) => <FlexItem key={i}>{k}: {rahlaRef[k as keyof RahlaRef]}</FlexItem>)}
                </Flex>
            </CardBody>
        </Card>
    </>;
}