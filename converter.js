
// This converters aims to convert XML files like psp.xml (camel) or pain.xml to Yaml DSL that  
// The result is a yaml file that can generate a camel KARAVAN integration with it 

//Structure of this File :
// For each ( route , rest , bean ..) There is two functions : 1) one To parse it from the file (e.g parseRoutes , parseBeans ..)
// 2) take the extracted xml and convert to the yaml we want 
//  ps : it respects identation 
// it is still not finished There are some cases i am still testing like : bean : class  /route : choice / multicast / rest ( not done yet) / restConfiguration (not done yet )




const fs = require('fs');
const xml2js = require('xml2js');


//  parse routes from the XML data

function parseRoutes(xmlData) {
    const routes = [];
    if (xmlData.blueprint && xmlData.blueprint.camelContext) {
        for (const camelContext of xmlData.blueprint.camelContext) {
            if (camelContext.route) {
                for (const route of camelContext.route) {
                    const routeObject = {
                        id: route.$.id,
                        children: []
                    };
                    // Iterate through child elements (excluding 'id' attribute)
                    for (const childElement in route) {
                        if (childElement !== 'id' && childElement !== '$') { // Exclude 'id' and '$'
                            const children = Array.isArray(route[childElement]) ? route[childElement] : [route[childElement]];
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



//  convert route objects to YAML DSL

function routesToYAML(routes) {
    let yaml = '';
    for (const route of routes) {
        yaml += `- route:\n`;
        yaml += `    id: ${route.id}\n`;
        yaml += `    from:\n`; // Start of "from" section
        for (const child of route.children) {
            if (child.tag === 'from') {
                yaml += `      uri: ${JSON.stringify(child.content.$.uri)}\n`; // Adding uri under from
                if (child.content.parameter) {
                    yaml += `      parameters:\n`;
                    for (const parameter of child.content.parameter) {
                        yaml += `        ${parameter.$.name}: ${JSON.stringify(parameter._)}\n`; // Adding parameters under from
                    }
                }
                yaml += `      steps:\n`; // Adding "steps"
            } else {
                yaml += `        - ${child.tag}:\n`; // Other children
                for (const key in child.content.$) {
                    yaml += `            ${key}: ${JSON.stringify(child.content.$[key])}\n`; // Adding attributes
                }
                for (const key in child.content) {
                    if (key !== '$') {
                        yaml += `            ${key}: ${JSON.stringify(child.content[key])}\n`; // Adding child elements
                    }
                }
            }
        }
    }
    return yaml;
}

function parseBeans(xmlData) {
  const beans = [];
  if (xmlData.blueprint && xmlData.blueprint.bean) {
      for (const bean of xmlData.blueprint.bean) {
          const beanObject = {
              id: bean.$.id,
              class: bean.$.class, // Include class attribute if it exists
              factoryBean: bean.$['factory-ref'],
              factoryMethod: bean.$['factory-method'],
              arguments: [], 
              properties: {}
          };

          // Extract arguments if they exist
          
          if (bean.argument) {
              const argumentsArr = Array.isArray(bean.argument) ? bean.argument : [bean.argument];
              for (const argument of argumentsArr) {
                  beanObject.arguments.push(argument.$.value);
              }
          }

          // Extract properties

          if (bean.property) {
              const propertiesArr = Array.isArray(bean.property) ? bean.property : [bean.property];
              for (const property of propertiesArr) {
                  const propertyName = property.$.name;
                  const propertyValue = property.$.ref !== undefined ? property.$.ref : property.$.value;
                  beanObject.properties[propertyName] = propertyValue;
              }
          }

          beans.push(beanObject);
      }
  }
  return beans;
}

// converts bean objects to YAML DSL
function beansToYAML(beans) {
  let yaml = `- beans:\n`;
  for (const bean of beans) {
      yaml += `    - constructors:\n`; //they are only one in our case

      //if (bean.class) {
      //yaml += `    - builderClass: ${bean.class}\n`;} // Include class attribute if it exists
      for (let i = 0; i < bean.arguments.length; i++) {
          yaml += `        '${i}': ${bean.arguments[i]}\n`;
      }
      if (bean.factoryBean) {
          yaml += `      factoryBean: ${bean.factoryBean}\n`;
      }
      if (bean.factoryMethod) {
          yaml += `      factoryMethod: ${bean.factoryMethod}\n`;
      }
      if (bean.id) {
          yaml += `      name: ${bean.id}\n`;
      }
      if (Object.keys(bean.properties).length > 0) {
          yaml += `      properties:\n`;
          for (const key in bean.properties) {
              yaml += `        ${key}: ${bean.properties[key]}\n`;
          }
      }
  }
  return yaml;
}


const xmlString = fs.readFileSync('test_psp.xml', 'utf-8');

// Parse XML data
let yamlList = [];
function appendYAML(yaml) {
  yamlList.push(yaml);
}

// Function to export YAML to an actual a yaml  file
function exportToYaml(filePath) {
  const textContent = yamlList.join('\n\n');
  fs.writeFileSync(filePath, textContent, 'utf-8');
  console.log(`YAMLs exported to ${filePath}`);
}

const parser = new xml2js.Parser();

parser.parseString(xmlString, (err, result) => {
    if (err) {
        console.error(err);
        return;
    }

    // Parse beans from XML data
    const beans = parseRoutes(result);

    // Convert beans to YAML
    const yaml = routesToYAML(beans);
    appendYAML(yaml);
  });


const parser1 = new xml2js.Parser();

parser1.parseString(xmlString, (err, result) => {
    if (err) {
        console.error(err);
        return;
    }

    const beans = parseBeans(result);
    const yaml = beansToYAML(beans);
    appendYAML(yaml);
});

exportToYaml('yamlDsl.camel.yaml');

