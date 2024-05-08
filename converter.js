// This converters aims to convert XML files like psp.xml (camel) or pain.xml to Yaml DSL that  
// The result is a yaml file that can generate a camel KARAVAN integration with it 

//Structure of this File :
// For each ( route , rest , bean ..) There is two functions : 1) one To parse it from the file (e.g parseRoutes , parseBeans ..)
// 2) take the extracted xml and convert to the yaml we want 
//  ps : it respects identation 

const yaml = require('js-yaml');
const fs = require('fs');
const xml2js = require('xml2js');

function parseRests(xmlData) {
    const rests = [];
    if (xmlData.blueprint && xmlData.blueprint.camelContext) {
        for (const camelContext of xmlData.blueprint.camelContext) {
            if (camelContext.rest) {
                for (const rest of camelContext.rest) {
                    const restObject = {
                        id: rest.$.id,
                        path: rest.$.path || '',
                        children: []
                    };
                    for (const childElement in rest) {
                        if (childElement !== '$') {  // '$' contains attributes of the rest element
                            const children = Array.isArray(rest[childElement]) ? rest[childElement] : [rest[childElement]];
                            for (const child of children) {
                                const childObj = {
                                    tag: childElement,
                                    attributes: child.$ || {},
                                    description: child.description ? child.description[0].trim() : '',
                                    to: child.to ? child.to[0].$.uri : ''
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
            }
        };

        const methods = {};

        for (const child of rest.children) {
            const methodObj = { ...child.attributes, description: child.description, to: child.to };

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
           // console.log(route)

            const routeObject = {
              id: route.$.id,
              errorHandlerRef: route.$.errorHandlerRef || undefined,
              children: [],
             
            };
  
            for (const childElement in route) {
              if (childElement !== 'id' && childElement !== '$' &&  childElement !== 'errorHandlerRef' ) {
                const children = Array.isArray(route[childElement]) ? route[childElement] : [route[childElement]];
                for (const child of children) {
                  routeObject.children.push({
                    tag: childElement,
                    content: child,
                  });
                }
              }
            }
            //console.log(routeObject)
            routes.push(routeObject);
          }
        }
      }
    }

    return routes;
  }
  
function processChild(child) {
   // console.log(child)
    const step = {};
    const content = child.content || {};
    if ('$' in content) {
        step[child.tag] = {...content.$};
    } else {
        step[child.tag] = {};
    }

    Object.keys(content).forEach(key => {
        if (key !== '$') {
            const value = content[key];
            step[child.tag][key] = serializeValue(value);
        }
    });
 //console.log(step)
    return step;
}
function serializeValue(value) {
    console.log("normal values = " , value)
    if (Array.isArray(value)) {
        if (value.every(item => typeof item !== 'object')) {
            // Join primitive items into a single string
            return value.join(' ');
        } else {
            // Handle arrays of objects by processing each object individually

            return value.map(item => serializeComplexObject(item));
        }
    } else if (typeof value === 'object' && value !== null) {
        return serializeComplexObject(value);
    } else {
        return value;
    }
}

function serializeComplexObject(obj) {
    console.log("complex = " , obj)
    if ('$' in obj) {
        const processedItem = {...obj.$};
        Object.keys(obj).filter(key => key !== '$').forEach(key => {
            processedItem[key] = serializeValue(obj[key]);
        });
        return processedItem;
    } else {
        const nestedObject = {};
        Object.keys(obj).forEach(key => {
            nestedObject[key] = serializeValue(obj[key]);
        });
        return nestedObject;
    }
}

function routesToYAML(routes) {
    return routes.map(route => {

      const from = route.children.find(child => child.tag === 'from');
  
      const routeEntry = {
        route: {
          id: route.id,  errorHandlerRef: route.errorHandlerRef ,
          from: {
            uri: from.content.$.uri,
            steps: route.children
              .filter(child => child.tag !== 'from')
              .map(processChild),
          },         


        },
      };
     // console.log(routeEntry.route.from.steps)

  
      return routeEntry;
    });
  }
  
function parseBeans(xmlData) {
    const beans = [];
    if (xmlData.blueprint && xmlData.blueprint.bean) {
        for (const bean of xmlData.blueprint.bean) {
            const beanObject = {
                properties: {}
            };
            for (const attribute in bean.$) {
                if (attribute === 'class') {
                    beanObject.type = bean.$[attribute]; 
                } else if (attribute === 'id') {
                    beanObject.name = bean.$[attribute]; 

                   } else if (attribute === 'factory-ref') {
                    beanObject.FactoryBean = bean.$[attribute]; 
                } 
                 else {
                    beanObject[attribute] = bean.$[attribute];
                }
            }
            if (bean.argument) {
                beanObject.arguments = bean.argument.map(argument => argument.$.value);
            }
            if (bean.property) {
                beanObject.properties = bean.property.reduce((props, prop) => {
                    props[prop.$.name] = prop.$.ref !== undefined ? prop.$.ref : prop.$.value;
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
            if (attr !== 'arguments' && attr !== 'properties') {
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

function parseRestConfiguration(xmlData) {
    const restConfigurations = [];
    if (xmlData.blueprint && xmlData.blueprint.camelContext) {
        for (const camelContext of xmlData.blueprint.camelContext) {
            if (camelContext.restConfiguration) {
                const restConfig = camelContext.restConfiguration[0]; 
                const restConfigurationObject = {
                    restConfiguration: {}
                };
                // Extraction of attributes of restConfiguration element
                for (const attribute in restConfig.$) {
                    restConfigurationObject.restConfiguration[attribute] = restConfig.$[attribute];
                }
                // Extraction of child elements dynamically
                for (const childElementName in restConfig) {
                    if (childElementName !== '$') { // Exclude attributes
                        restConfigurationObject.restConfiguration[childElementName] = [];
                        const childElements = Array.isArray(restConfig[childElementName]) ? restConfig[childElementName] : [restConfig[childElementName]];
                        for (const childElement of childElements) {
                            const childObj = {};
                            for (const attribute in childElement.$) {
                                childObj[attribute] = childElement.$[attribute];
                            }
                            restConfigurationObject.restConfiguration[childElementName].push(childObj);
                        }
                    }
                }
                restConfigurations.push(restConfigurationObject);
            }
        }
    }
    return restConfigurations;
}


const yamlList = [];
const xmlString = fs.readFileSync('largexml.xml', 'utf-8');
const parser = new xml2js.Parser();

// Parse XML data




parser.parseString(xmlString, (err, result) => {
    if (err) {
        console.error(err);
        return;
    }

    const routes = parseRoutes(result);
    const beans = parseBeans(result);
    const rests = parseRests(result);
    const restsconfig = parseRestConfiguration(result);

    let beansYaml = beansToYAML(beans);
     beansYaml = '- ' + yaml.dump(beansYaml);

    fs.writeFileSync('yamlDsl.camel.yaml', beansYaml, 'utf8');


    let restsYaml = restsToYAML(rests);
    restsYaml = yaml.dump(restsYaml);
    fs.appendFileSync('yamlDsl.camel.yaml', restsYaml, 'utf8');

    const restsconfigYaml = yaml.dump(restsconfig);
    fs.appendFileSync('yamlDsl.camel.yaml', restsconfigYaml, 'utf8');


    let routesYaml = routesToYAML(routes);
    routesYaml = yaml.dump(routesYaml);
    fs.appendFileSync('yamlDsl.camel.yaml', routesYaml, 'utf8');
}); 