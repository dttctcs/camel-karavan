const fs = require('fs');
const yaml = require('js-yaml');
const xml2js = require('xml2js');

// Load YAML data
function loadYAML(filePath) {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return yaml.load(fileContents);
}

// Validate XML element name
function isValidElementName(name) {
    const regex = /^[a-zA-Z_][\w.\-]*$/;
    return regex.test(name);
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
                $: { path: section.rest.path || '' }
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

        const routes = Array.isArray(section.route) ? section.route : [section.route];
        routes.forEach(routeObj => {
            if (routeObj) {
                const route = routeObj;
                const routeElement = {
                    $: { id: route.id, errorHandlerRef: route.errorHandlerRef || undefined },
                    from: { $: { uri: route.from.uri } },
                    steps: []
                };

                const processSteps = (steps, parentArray) => {
                    steps.forEach(step => {
                        console.log("step", step);
                        const stepKey = Object.keys(step)[0];
                        const stepAttrs = { ...step[stepKey] };
                        let stepElement = { [stepKey]: { $: stepAttrs } };

                        if (stepAttrs.expression) {
                            const expressionKey = Object.keys(stepAttrs.expression)[0];
                            stepElement = {
                                [stepKey]: {
                                    $: { name: stepAttrs.name },
                                    [expressionKey]: stepAttrs.expression[expressionKey].expression
                                }
                            };
                            delete stepAttrs.expression;
                        }

                        if (step[stepKey].steps) {
                            stepElement[stepKey].steps = [];
                            processSteps(step[stepKey].steps, stepElement[stepKey].steps);
                            delete stepElement[stepKey].$.steps;
                        }

                        parentArray.push(stepElement);
                    });
                };

                const stepsArray = [];
                processSteps(route.from.steps, stepsArray);
                stepsArray.forEach(stepElement => {
                    const stepKey = Object.keys(stepElement)[0];
                    if (!routeElement[stepKey]) {
                        routeElement[stepKey] = [];
                    }
                    routeElement[stepKey].push(stepElement[stepKey]);
                });

                xmlData.blueprint.camelContext.route.push(routeElement);
            }
        });
    });

    return builder.buildObject(xmlData);
}

// Main execution
const yamlData = loadYAML('yamlDsl.camel.yaml');
let  xmlContent = convertYAMLToXML(yamlData);
xmlContent = xmlContent.replace(/<steps>\n /g, '').replace(/<\/steps>\n /g, '');

fs.writeFileSync('./converted_ops.xml', xmlContent, 'utf8');
console.log('XML file has been created successfully.');
