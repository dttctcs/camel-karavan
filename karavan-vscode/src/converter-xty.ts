// @ts-nocheck
// This converters aims to convert XML files like psp.xml (camel) or pain.xml to Yaml DSL that
// The result is a yaml file that can generate a camel KARAVAN integration with it
//Structure of this File :
// For each ( route , rest , bean ..) There is two functions : 1) one To parse it from the file (e.g parseRoutes , parseBeans ..)
// 2) take the extracted xml and convert to the yaml we want
//  ps : it respects identation

import yaml from 'js-yaml';
import * as fs from 'fs';
import xml2js from 'xml2js';

function parseRests(xmlData) {
    const rests = [];
    if (xmlData.blueprint && xmlData.blueprint.camelContext) {
        for (const camelContext of xmlData.blueprint.camelContext) {
            if (camelContext.rest) {
                for (const rest of camelContext.rest) {
                    const restObject = {
                        id: rest.$.id,
                        path: rest.$.path || "",
                        children: [],
                    };
                    for (const childElement in rest) {
                        if (childElement !== "$") {
                            // '$' contains attributes of the rest element
                            const children = Array.isArray(rest[childElement])
                                ? rest[childElement]
                                : [rest[childElement]];
                            for (const child of children) {
                                const childObj = {
                                    tag: childElement,
                                    attributes: child.$ || {},
                                    description: child.description
                                        ? child.description[0].trim()

                                        : "",
                                    to: child.to ? child.to[0].$.uri : "",
                                };
                                restObject.children.push(childObj);
                            }
                        }
                    }
                    rests.push(restObject);
                }
            }
        }
    }
    return rests;
}

function restsToYAML(rests) {
    const yaml = [];

    for (const rest of rests) {
        const restObj = {
            rest: {
                id: rest.id,
                path: rest.path,
            },
        };

        const methods = {};

        for (const child of rest.children) {
            const methodObj = {
                ...child.attributes,
                description: child.description,
                to: child.to,
            };

            const methodType = child.tag.toLowerCase();
            methods[methodType] = methods[methodType] || [];
            methods[methodType].push(methodObj);
        }
        Object.assign(restObj.rest, methods);

        yaml.push(restObj);
    }

    return yaml;
}

function parseRoutes(xmlData) {
    const routes = [];

    if (xmlData.blueprint && xmlData.blueprint.camelContext) {
        for (const camelContext of xmlData.blueprint.camelContext) {
            if (camelContext.route) {
                for (const route of camelContext.route) {
                    const routeObject = {
                        id: route.$.id,
                        errorHandlerRef: route.$.errorHandlerRef || undefined,
                        children: [],
                    };

                    for (const childElement in route) {
                        if (
                            childElement !== "id" &&
                            childElement !== "$" &&
                            childElement !== "errorHandlerRef"
                        ) {
                            const children = Array.isArray(route[childElement])
                                ? route[childElement]
                                : [route[childElement]];
                            for (const child of children) {
                                routeObject.children.push({
                                    tag: childElement,
                                    content: child,
                                });
                            }
                        }
                    }
                    routes.push(routeObject);
                }
            }
        }
    }

    return routes;
}

function processChild(child, id) {
    const content = child.content || child;
    if (content?.["#name"] === "from" || (child.tag && child.tag !== "$$")) {
        return;
    }

    let yamlObject = {};
    const name = content?.["#name"];

    // If there is a $ key, it means these are the attributes for this step
    if ("$" in content) {
        yamlObject[name] = { ...content.$ };

    } else if (content._) {
        yamlObject = content._;


    } else {
        yamlObject[name] = {};
    }

    // Put steps if it is a multicast or these
    const shouldStep = name === "multicast" || name === "when" || name === "split" || name === "otherwise" || name === "aggregate" || name === "doCatch" || name === "doFinally" || name === "doFinally" || name === "filter" || name === "idempotentConsumer" || name === "loop" || name === "resequence" || name === "step" || name === "transacted";

    // Manage the children recursively

    if (content.$$) {
        const childContents = content.$$;
        childContents.forEach((childContent) => {
            const childName = childContent["#name"];

            if (childName in content) {
                const value = processChild(childContent, `___${id}-${childName}`);



                if (shouldStep) {
                    // probably can cause bug, but i don't know where
                    // If it does, try to remove this if, but the xpath on when will not work
                    if (typeof value === "string") {
                        if (yamlObject[name][childName]) {
                            if (!Array.isArray(yamlObject[name][childName])) {
                                yamlObject[name][childName] = [yamlObject[name][childName]];
                            }
                            yamlObject[name][childName].push(value);
                        } else {
                            // This is the first entry, assign it directly

                            yamlObject[name][childName] = value;
                        } return;
                    }
                    // Outdated comment
                    // If it is a string, create an object with childName as key
                    if (!yamlObject[name].steps) {
                        yamlObject[name].steps = [];
                    }
                    const givenValue = typeof value === "string" ? { [childName]: value } : value;
                    yamlObject[name].steps.push(givenValue);
                    return;
                }


                // If the value has the same key as the child
                // E.g process:
                //       process:
                //         ref: TechTreeProcessor
                // Then remove the child key and put the value directly
                if (value[childName]) {
                    // If the value is already there, convert it to array
                    if (yamlObject[name][childName]) {
                        if (!Array.isArray(yamlObject[name][childName])) {
                            yamlObject[name][childName] = [yamlObject[name][childName]];
                        }
                        yamlObject[name][childName].push(value[childName]);
                        return;
                    }

                    yamlObject[name][childName] = [value[childName]];
                    return;
                }


                yamlObject[name][childName] = value;
            } else {
                yamlObject[name][childName] = processChild(
                    childContent,
                    `${id}-${childName}`
                );
            }
        });
    }

    return yamlObject;
}

function routesToYAML(routes) {
    return routes.map((route) => {
        const from = route.children.find((child) => child.tag === "from");

        const routeEntry = {
            route: {
                id: route.id,
                errorHandlerRef: route.errorHandlerRef,
                from: {
                    uri: from.content.$.uri,
                    steps: route.children
                        .filter((child) => child.tag !== "from")
                        .map((child) => processChild(child, route.id))
                        .filter((child) => child),
                },
            },
        };

        return routeEntry;
    });
}

function parseBeans(xmlData) {
    const beans = [];
    if (xmlData.blueprint && xmlData.blueprint.bean) {
        for (const bean of xmlData.blueprint.bean) {
            const beanObject = {
                properties: {},
            };
            for (const attribute in bean.$) {
                if (attribute === "class") {
                    beanObject.type = bean.$[attribute];
                } else if (attribute === "id") {
                    beanObject.name = bean.$[attribute];
                } else if (attribute === "factory-ref") {
                    beanObject.factoryBean = bean.$[attribute];
                } else if (attribute === "factory-method") {
                    beanObject.factoryMethod = bean.$[attribute];
                } else {
                    beanObject[attribute] = bean.$[attribute];
                }
            }
            if (bean.argument) {
                beanObject.arguments = bean.argument.map(
                    (argument) => argument.$.value
                );
            }
            if (bean.property) {
                beanObject.properties = bean.property.reduce((props, prop) => {
                    props[prop.$.name] =
                        prop.$.ref !== undefined ? prop.$.ref : prop.$.value;
                    return props;
                }, {});
            }

            beans.push(beanObject);
        }
    }
    return beans;
}
function beansToYAML(beans) {
    let yaml = { beans: [] };
    for (const bean of beans) {
        let beanObj = {};
        for (const attr in bean) {
            if (attr !== "arguments" && attr !== "properties") {
                beanObj[attr] = bean[attr];
            }
        }
        if (bean.arguments && bean.arguments.length > 0) {
            beanObj.constructors = bean.arguments.reduce((args, arg, index) => {
                args[index] = arg;
                return args;
            }, {});
        }
        if (Object.keys(bean.properties).length > 0) {
            beanObj.properties = bean.properties;
        }
        yaml.beans.push(beanObj);
    }

    return yaml;
}

function parseReference(xmlData) {
    const refs = [];
    if (xmlData.blueprint && xmlData.blueprint.reference) {
        const references = Array.isArray(xmlData.blueprint.reference) ? xmlData.blueprint.reference : [xmlData.blueprint.reference];

        for (const reference of references) {
            const referenceObj = {
                id: reference.$.id,
                interface: reference.$.interface || "",
                filter: reference.$.filter || "",
            };
            refs.push({ reference: referenceObj });
        }
    }
    return refs;
}



function parseRestConfiguration(xmlData) {
    const restConfigurations = [];
    if (xmlData.blueprint && xmlData.blueprint.camelContext) {
        for (const camelContext of xmlData.blueprint.camelContext) {
            if (camelContext.restConfiguration) {
                const restConfig = camelContext.restConfiguration[0];
                const restConfigurationObject = {
                    restConfiguration: {},
                };
                // Extraction of attributes of restConfiguration element
                for (const attribute in restConfig.$) {
                    restConfigurationObject.restConfiguration[attribute] =
                        restConfig.$[attribute];
                }
                // Extraction of child elements dynamically
                for (const childElementName in restConfig) {
                    if (childElementName !== "$") {
                        // Exclude attributes
                        restConfigurationObject.restConfiguration[childElementName] = [];
                        const childElements = Array.isArray(restConfig[childElementName])
                            ? restConfig[childElementName]
                            : [restConfig[childElementName]];
                        for (const childElement of childElements) {
                            const childObj = {};
                            for (const attribute in childElement.$) {
                                childObj[attribute] = childElement.$[attribute];
                            }
                            restConfigurationObject.restConfiguration[childElementName].push(
                                childObj
                            );
                        }
                    }
                }
                restConfigurations.push(restConfigurationObject);
            }
        }
    }
    return restConfigurations;
}



// Parse XML data
//There is two parser because each parser treat data differently Routes have complex type
function convert(xmlFile: string, targetYaml: string) {

    console.log('reading xml: ', xmlFile);
    console.log('Target yaml: ', targetYaml);
    const xmlString = fs.readFileSync(xmlFile, "utf-8");
    const parser = new xml2js.Parser();
    const parser2 = new xml2js.Parser({
        explicitChildren: true,
        preserveChildrenOrder: true,
    });

    parser.parseString(xmlString, (err, result) => {
        if (err) {
            console.error(err);
            return;
        }

        const beans = parseBeans(result);
        let beansYaml = beansToYAML(beans);
        beansYaml = "- " + yaml.dump(beansYaml);
        if (beans.length)
            fs.writeFileSync(targetYaml, beansYaml, "utf8");
        else {
            fs.writeFileSync(targetYaml, "", "utf8");
        }

        const refs = parseReference(result)
        const Reference = yaml.dump(refs);
        if (refs.length)
            fs.appendFileSync(targetYaml, Reference, "utf8");

        const restsconfig = parseRestConfiguration(result);
        const restsconfigYaml = yaml.dump(restsconfig);

        if (restsconfig.length)
            fs.appendFileSync(targetYaml, restsconfigYaml, "utf8");


        const rests = parseRests(result);
        let restsYaml = restsToYAML(rests);
        restsYaml = yaml.dump(restsYaml);
        if (rests.length)
            fs.appendFileSync(targetYaml, restsYaml, "utf8");

    });
    parser2.parseString(xmlString, (err, result) => {
        if (err) {
            console.error(err);
            return;
        }

        const routes = parseRoutes(result);
        let routesYaml = routesToYAML(routes);
        routesYaml = yaml.dump(routesYaml);
        if (routes.length) //so we wont have empty lists [] if we ever didnt have routes ,same for beans ..refs .. etc
            fs.appendFileSync(targetYaml, routesYaml, "utf8");
    });
    console.log("done");
}


// convert("test_psp.xml");
export default convert as xmlToYamlConverter;