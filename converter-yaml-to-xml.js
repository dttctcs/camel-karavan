const fs = require('fs');
const yaml = require('js-yaml');
const xml2js = require('xml2js');
const xmljs = require('xml-js');

// Load YAML data
function loadYAML(filePath) {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return yaml.load(fileContents);
}


// Convert YAML data to XML format
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
                $: { id:section.rest.id ,
                    path: section.rest.path || '' }
            };

            const httpMethods = ['get', 'post', 'put', 'delete', 'patch', 'options'];
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
                Object.entries(step[stepKey]).forEach(([key, value]) => {

                    if (key === 'steps' && Array.isArray(value)) {
                        const otherProps = Object.entries(step[stepKey]).filter(([k, v]) => k !== 'steps');
                        otherProps.forEach(([propKey, propValue]) => {
                            // Check for expression in string values
                            if (typeof propValue === 'string' && expressionTypes.has(propKey)) {
                                stepElement[stepKey].children.push({ [propKey]: propValue });
                                delete stepElement[stepKey].$
                            }
                        });

                        processSteps(value, stepElement[stepKey].children);
                    }
                      //TODO FIX THE MARSHAL THING AND THE IDS REMOVAL !
                    else if (Array.isArray(value) && value.every(item => typeof item === 'object' && !Array.isArray(item))) {
                        value.forEach(item => {
                            const childElement = { [key]: { $: {}, children: [] } };
                            Object.entries(item).forEach(([itemKey, itemValue]) => {
                                if (itemKey === 'steps' && Array.isArray(itemValue)) {
                                    // Recursively handlinng nested 'steps'
                                    processSteps(itemValue, childElement[key].children);
                                } else if (typeof itemValue === 'object' && !Array.isArray(itemValue)) {
                                    // Treat as a nested object within children
                                    childElement[key].children.push({ [itemKey]: itemValue });
                                } else {
                                    // basically as attribute
                                    childElement[key].children.push({ [itemKey]: itemValue });
                                }
                            });
                            stepElement[stepKey].children.push(childElement);
                        });
                    } else if (typeof value === 'object' && !Array.isArray(value)) {
                        stepElement[stepKey].children.push({ [key]: value });
                    } else if (Array.isArray(value)) {
                        // Handle arrays of primitives directly under the key
                        stepElement[stepKey][key] = value;
                    } else {
                        stepElement[stepKey].$[key] = value;
                    }
                });
                parentArray.push(stepElement);
            });
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
                // Flatten the steps for the route element properly
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


// Main execution
let yamlData = loadYAML('yamlDsl.camel.yaml');
let  xmlContent = convertYAMLToXML(yamlData);


xmlContent = xmlContent.replace(/<steps>\n /g, '').replace(/<\/steps>\n /g, '');
xmlContent = xmlContent.replace(/<children>\n /g, '').replace(/<\/children>\n /g, '');
xmlContent = xmlContent.replace(/<item>\n /g, '').replace(/<\/item>\n /g, '');

const regex = /<expression>\s*<([A-Za-z0-9]+)>\s*<expression>(.*?)<\/expression>\s*<\/\1>\s*<\/expression>/gs;
xmlContent = xmlContent.replace(regex, '<$1>$2</$1>');



function prefunct(xmlString) {
    const jsObj = xmljs.xml2js(xmlString, { compact: false });
    const options = { compact: false, spaces: 2 };
    const prettyXML = xmljs.js2xml(jsObj, options);
    return prettyXML;
}
const prettyXML = prefunct(xmlContent);
fs.writeFileSync('./converted_ops.xml', prettyXML, 'utf8');
console.log('XML file has been created successfully.');
