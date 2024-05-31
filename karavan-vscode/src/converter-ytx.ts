//@ts-nocheck
import yaml from 'js-yaml';
import * as fs from 'fs';
import xml2js from 'xml2js';
import xmljs from 'xml-js';

function loadYAML(filePath) {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return yaml.load(fileContents);
}


function convertYAMLToXML(yamlData) {
    const builder = new xml2js.Builder({
        xmldec: { version: '1.0', encoding: 'UTF-8', standalone: null },
        renderOpts: { pretty: true, indent: '  ', newline: '\n' }
    });
    const xmlData = {
        blueprint: {
            $: {
                xmlns: "http://www.osgi.org/xmlns/blueprint/v1.0.0",
                "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
                "xmlns:cm": "http://aries.apache.org/blueprint/xmlns/blueprint-cm/v1.0.0",
                "xmlns:camel": "http://camel.apache.org/schema/blueprint",
                "xsi:schemaLocation": "http://www.osgi.org/xmlns/blueprint/v1.0.0 http://www.osgi.org/xmlns/blueprint/v1.0.0/blueprint.xsd http://aries.apache.org/blueprint/xmlns/blueprint-cm/v1.0.0 http://aries.apache.org/blueprint/xmlns/blueprint-cm/v1.0.0/blueprint-cm.xsd http://camel.apache.org/schema/blueprint http://camel.apache.org/schema/blueprint/camel-blueprint.xsd"
            },
            ["cm:property-placeholder"]: {
                $: {
                    id: "settings.props",
                    "persistent-id": "settings",
                    "update-strategy": "reload",
                }
            },
            reference: [],
            camelContext: {
                $: { id: "camelContext", xmlns: "http://camel.apache.org/schema/blueprint" },
                restConfiguration: [],
                rest: [],
                route: []
            },
            bean: []
        }
    };

    yamlData.forEach(section => {
        if ('beans' in section) {
            section.beans.forEach(bean => {
                const beanElement = {
                    $: {
                        id: bean.name,
                        class: bean.type || undefined,
                        "factory-bean": bean.factoryBean || undefined,
                        "factory-method": bean.factoryMethod || undefined
                    }
                };
                if (bean.constructors) {
                    beanElement.argument = Object.entries(bean.constructors).map(([index, value]) => ({
                        $: { value }
                    }));
                }
                if (bean.properties) {
                    beanElement.property = Object.entries(bean.properties).map(([name, value]) => ({
                        $: { name, value }
                    }));
                }
                xmlData.blueprint.bean.push(beanElement);
            });
        }

        if ('reference' in section) {
            xmlData.blueprint.reference.push({
                $: {
                    id: section.reference.id,
                    interface: section.reference.interface,
                    filter: section.reference.filter || ''
                }
            });
        }

        if ('restConfiguration' in section) {
            const restConfig = {
                $: {
                    component: section.restConfiguration.component,
                    bindingMode: section.restConfiguration.bindingMode,
                    contextPath: section.restConfiguration.contextPath,
                    port: section.restConfiguration.port,
                    host: section.restConfiguration.host,
                    apiContextRouteId: section.restConfiguration.apiContextRouteId,
                    apiContextPath: section.restConfiguration.apiContextPath,
                    enableCORS: section.restConfiguration.enableCORS,
                },
                dataFormatProperty: [],
                apiProperty: [],
            };
            section.restConfiguration.dataFormatProperty.forEach(prop => {
                restConfig.dataFormatProperty.push({ $: prop });
            });
            section.restConfiguration.apiProperty.forEach(prop => {
                restConfig.apiProperty.push({ $: prop });
            });
            xmlData.blueprint.camelContext.restConfiguration.push(restConfig);
        }

        if ('rest' in section) {
            const restElement = {
                $: {
                    id: section.rest.id,
                    path: section.rest.path || ''
                }
            };

            const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];
            httpMethods.forEach(method => {
                if (method in section.rest) {
                    restElement[method] = section.rest[method].map(verb => {
                        const verbAttributes = { ...verb };
                        delete verbAttributes.to;
                        delete verbAttributes.description;

                        const verbElement = {
                            $: verbAttributes,
                            to: { $: { uri: verb.to || '' } }
                        };

                        if (verb.description) {
                            verbElement.description = verb.description;
                        }

                        return verbElement;
                    });
                }
            });

            xmlData.blueprint.camelContext.rest.push(restElement);
        }

        const processSteps = (steps, parentArray) => {
            steps.forEach(step => {
                const stepKey = Object.keys(step)[0];
                let stepElement = { [stepKey]: { $: {}, children: [] } };
                const expressionTypes = new Set([
                    "constant", "simple", "groovy", "header", "java", "xpath", "xquery", "xtokenize",
                    "jsonpath", "method", "mvel", "ognl", "python", "ref", "spel", "tokenize", "variable",
                    "datasnonnet", "exchangeProperty"
                ]);

                // Iterate through each property in the current step
                Object.entries(step[stepKey]).forEach(([key, value]) => {

                    if (key === 'steps' && Array.isArray(value)) {
                        processSteps(value, stepElement[stepKey].children);
                    } else if (typeof value === 'object' && !Array.isArray(value)) {

                        if (value.steps && Array.isArray(value.steps)) {
                            // Special handling for nested steps within objects
                            const nestedStepElement = { [key]: { $: {}, children: [] } };
                            processSteps(value.steps, nestedStepElement[key].children);
                            stepElement[stepKey].children.push(nestedStepElement);
                        } else {
                            // General handling for nested objects
                            processNestedObjects(value, stepElement[stepKey].children, key);
                        }
                    } else if (Array.isArray(value)) {

                        value.forEach(item => {

                            if (typeof item === 'object' && !Array.isArray(item)) {
                                const childElement = processNestedObjects(item, [], key);
                                stepElement[stepKey].children.push(childElement);
                            } else {
                                // Directly handle primitive values in arrays
                                stepElement[stepKey].children.push({ [key]: item });
                            }
                        });
                    } else {
                        stepElement[stepKey].$[key] = value;
                    }

                });
                parentArray.push(stepElement);
            });
        };

        const processNestedObjects = (object, childrenArray, objectKey) => {
            const element = { [objectKey]: { $: {}, children: [] } };
            Object.entries(object).forEach(([key, value]) => {
                if (typeof value === 'object' && !Array.isArray(value)) {
                    if (value.steps && Array.isArray(value.steps)) {
                        processSteps(value.steps, element[objectKey].children);
                    } else {
                        processNestedObjects(value, element[objectKey].children, key);
                    }
                } else if (Array.isArray(value)) {
                    value.forEach(subItem => {
                        if (typeof subItem === 'object') {
                            processNestedObjects(subItem, element[objectKey].children, key);
                        } else {
                            element[objectKey].children.push({ [key]: subItem });
                        }
                    });
                } else {
                    element[objectKey].$[key] = value;
                }
            });
            childrenArray.push(element);
            return element;
        };

        const routes = Array.isArray(section.route) ? section.route : [section.route];
        routes.forEach(routeObj => {
            if (routeObj) {
                const route = routeObj;
                const routeElement = {
                    $: { id: route.id, errorHandlerRef: route.errorHandlerRef || undefined },
                    from: { $: { uri: route.from.uri } },
                    steps: []
                };
                processSteps(route.from.steps, routeElement.steps);
                routeElement.steps = flattenSteps(routeElement.steps);
                xmlData.blueprint.camelContext.route.push(routeElement);
            }
        });

        function flattenSteps(steps) {


            const flattened = [];
            steps.forEach(step => {
                const stepKey = Object.keys(step)[0];
                if (step[stepKey].children && step[stepKey].children.length > 0) {
                    step[stepKey].children = flattenSteps(step[stepKey].children);
                }

                flattened.push(step);
            });
            return flattened;
        }
    });

    return builder.buildObject(xmlData);
}

function cleanIds(data) {
    const idRegex = /-\b[0-9a-f]{4}\b$/;
    if (Array.isArray(data)) {
        data.forEach(item => cleanIds(item));
    } else if (typeof data === 'object' && data !== null) {
        Object.keys(data).forEach(key => {
            if (key === 'id' && typeof data[key] === 'string' && idRegex.test(data[key])) {
                delete data[key]; // Remove the autogenerated ID
            } else if (typeof data[key] === 'object') {
                cleanIds(data[key]);
            }
        });
    }
}

function adjustUriAndRemoveParameters(data: any) {
    if (Array.isArray(data)) {
        data.forEach(item => adjustUriAndRemoveParameters(item));
    } else if (typeof data === 'object' && data !== null) {
        Object.keys(data).forEach(key => {
            if (data[key] && typeof data[key] === 'object' && data[key].uri && data[key].parameters) {
                let parameterParts = [];
                Object.keys(data[key].parameters).forEach(param => {
                    if (param === 'name' || param === 'bucketName' || param === 'timerName' || param === 'dataSourceName') {
                        parameterParts.push(data[key].parameters[param]);
                    } else {
                        parameterParts.push(`${param}=${data[key].parameters[param]}`);
                    }
                });
                let base = data[key].uri;
                let primaryParam = parameterParts.shift();
                data[key].uri = `${base}:${primaryParam}`;
                if (parameterParts.length > 0) {
                    data[key].uri += `?${parameterParts.join('&amp;')}`;
                }
                delete data[key].parameters;
            }
            if (typeof data[key] === 'object') {
                adjustUriAndRemoveParameters(data[key]);
            }
        });
    }
}

function prefunct(xmlString) {
    const jsObj = xmljs.xml2js(xmlString, { compact: false });
    const options = { compact: false, spaces: 2 };
    const prettyXML = xmljs.js2xml(jsObj, options);
    return prettyXML;
}



function ConvertyamltoXMl(file: string, output: string) {
    let yamlData = loadYAML(file);

    adjustUriAndRemoveParameters(yamlData);
    cleanIds(yamlData);

    let xmlContent = convertYAMLToXML(yamlData);


    xmlContent = xmlContent.replace(/<steps>\n /g, '').replace(/<\/steps>\n /g, '');
    xmlContent = xmlContent.replace(/<children>\n /g, '').replace(/<\/children>\n /g, '');
    xmlContent = xmlContent.replace(/<item>\n /g, '').replace(/<\/item>\n /g, '');
    const regex = /<expression>\s*<([A-Za-z0-9]+) expression="([^"]+)".*?\/>\s*<\/expression>/gs;

    xmlContent = xmlContent.replace(regex, '<$1>$2</$1>');


    const prettyXML = prefunct(xmlContent);

    fs.writeFileSync(output, prettyXML, 'utf8');

}



// ConvertyamltoXMl("yamlDsl.camel.yaml");

// console.log('done vice verca.');
export default ConvertyamltoXMl;