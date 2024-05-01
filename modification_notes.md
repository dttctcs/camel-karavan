
# How is the extension modified?

## Implementation of ReferenceConfiguration definition

- Defined the `ReferenceConfigurationDefinition` as `CamelElement` in [Core/CamelDefinition.ts](./karavan-core/src/core/model/CamelDefinition.ts)
- Defined the `readReferenceConfigurationDefinition` in [Core/CamelDefinitionYamlStep.ts](./karavan-core/src/core/api/CamelDefinitionYamlStep.ts)
- Added reference to rules in `flowsToCamelElements` in [Core/CamelDefinitionYaml.ts](./karavan-core/src/core/api/CamelDefinitionYaml.ts)
- Added `ReferenceConfigurationDefinition` to the list of recognized `DSL`s in method:`createStep` and defined a creator function for it in [CamelDefinitionApi.ts](./karavan-core/src/core/api/CamelDefinitionApi.ts)
- GUI implemented in [Karavan-designer/refs](./karavan-designer/src/designer/refs/) and added to [Karavan-designer/App.tsx](./karavan-designer/src/designer/KaravanDesigner.tsx)