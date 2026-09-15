export {
  AlmasixIndex,
  SymbolKind,
  type Located,
  type EnvEntry,
  type ViewVarEntry,
  type RouteEntry,
  type TableEntry,
  type ModelEntry,
  type AlmasixIndexFields,
} from "./types";

export {
  IndexLoader,
  AlmasixIndexLoader,
  parse,
  buildIndexCommand,
  type IndexCommand,
} from "./indexLoader";
export { CallSiteDetector, detect, type CallSite, type Site } from "./callSiteDetector";
export {
  ModelResolver,
  AlmasixModelResolver,
  AUTH_USER_SENTINEL,
  columnsFor,
  peelModelHint,
  resolveTable,
  inferModel,
  inferChainHead,
  authUserModel,
  pluralize,
} from "./modelResolver";
export {
  CompletionCatalog,
  AlmasixCompletionCatalog,
  symbolsFor,
  relationsFor,
} from "./completionCatalog";
export { EnvBulkInsert, AlmasixEnvBulkInsert, type EnvBulkOffer } from "./envBulkInsert";
export {
  SymbolLocator,
  AlmasixSymbolLocator,
  hitAt,
  type SymbolHit,
  type TextRange,
} from "./symbolLocator";
export {
  SymbolResolver,
  AlmasixSymbolResolver,
  resolve,
  resolveColumn,
  locateNestedKeyLine,
  type SymbolTarget,
  type ResolveTarget,
} from "./symbolResolver";
export {
  CallSiteSearcher,
  AlmasixCallSiteSearcher,
  type Occurrence,
} from "./callSiteSearcher";
export {
  RenamePlanner,
  AlmasixRenamePlanner,
  type RenameEdit,
  type FileMove,
  type RenamePlan,
} from "./renamePlanner";
export { HoverDocs, AlmasixHoverDocs } from "./hoverDocs";
export {
  PrismStructure,
  AlmasixPrismStructure,
  PRISM_PAIRS,
  PAIRS,
  analyze,
  type PrismIssue,
  type StructureIssue,
} from "./prismStructure";
export {
  RefactorPlanner,
  AlmasixRefactorPlanner,
  type RefactorEdit,
  type RefactorPlan,
} from "./refactorPlanner";
export {
  RelationStubPlanner,
  AlmasixRelationStubPlanner,
  type RelationStubEdit,
  type RelationStubPlan,
} from "./relationStubPlanner";
export {
  ArticulateHelpers,
  AlmasixArticulateHelpers,
  type ArticulateSnippet,
} from "./articulateHelpers";
export {
  CodeActionPlanner,
  AlmasixCodeActionPlanner,
  type CodeAction,
} from "./codeActionPlanner";
export {
  FileTemplates,
  AlmasixFileTemplates,
  type FileTemplateSpec,
} from "./fileTemplates";
export {
  MakeCatalog,
  AlmasixMakeCatalog,
  type MakeGenerator,
  type Generator,
  type ModelOptions,
} from "./makeCatalog";
export {
  IndexService,
  findBootstrapRoot,
  isIndexRelevant,
} from "./indexService";
export { SymbolHits, allHits } from "./symbolHits";
export {
  ToolWindowModel,
  AlmasixToolWindowModel,
  type ToolWindowSummary,
  type SymbolRow,
} from "./toolWindowModel";
