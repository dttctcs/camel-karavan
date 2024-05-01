
import React, { useCallback, useState } from "react";
import { RahlaRef } from "./RefsDesigner";
import { Card, CardBody, CardHeader, CardTitle, Flex, FlexItem } from "@patternfly/react-core";

export interface RefCardProps {
    rahlaRef: RahlaRef,
    onClick?: (r: RahlaRef) => void,
    isSelected: boolean
}

export const RefCard = ({ rahlaRef, onClick, isSelected }: RefCardProps) => {
    const [hovered, setHovered] = useState(false);
    return <>
        <Card
            style={{
                backgroundColor: isSelected ? '#0d0d0d' : (hovered ? "#262626" : undefined),
                cursor: 'pointer',
                borderColor: isSelected ? '#0099e6' : 'white',
                borderStyle: isSelected ? 'ridge' : 'dotted',
                borderWidth: 1
            }}
            onClick={() => { onClick && onClick(rahlaRef) }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <CardHeader>
                <CardTitle style={{fontSize:'1.6rem'}}>Ref</CardTitle>
            </CardHeader>
            <CardBody>
                <Flex direction={{default:'column'}} alignItems={{ default: 'alignItemsFlexStart' }} rowGap={{ default: "rowGapMd" }}>
                    {Object.keys(rahlaRef).map((k, i) => <FlexItem key={i}><b>{k}</b>: {rahlaRef[k as keyof RahlaRef]}</FlexItem>)}
                </Flex>
            </CardBody>
        </Card>
    </>;
}