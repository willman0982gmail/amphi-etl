import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { ComponentManager } from "@amphi/pipeline-components-manager";
import { BaseCoreComponent } from "./components/BaseCoreComponent";

// Import allow to add the component to the palette. Order does not matter.
import {
  Aggregate, Console, ExcelFileOutput, CsvFileInput, JsonFileInput, JsonFileOutput, ExcelFileInput, CsvFileOutput, CustomTransformations, Filter, RestInput,
  SplitColumn, Deduplicate, ExpandList, Sample, Sort, RenameColumns, TypeConverter, Extract, GoogleSheetsInput, GoogleSheetsOutput, FilterColumns, Join, CombinedJoin,
  ParquetFileInput, ParquetFileOutput, PostgresInput, PostgresOutput, MySQLInput, MySQLOutput, XmlFileInput, XmlFileOutput, DateTimeConverter,
  EnvVariables, EnvFile, Transpose, Unite, Pivot, Annotation, ODBCInput, PdfTablesInput, Summary, LocalFileInput, FlattenJSON, ExplodeJSON, ValidateJSON,
  DataCleansing, GenerateIDColumn, SqlServerInput, OracleInput, Connection, SnowflakeInput, FormulaRow, InlineInput, S3FileOutput, S3FileInput,
  SnowflakeOutput, SqlServerOutput, OracleOutput, CustomInput, CustomOutput, FileUtils, FrequencyAnalysis, FormExample, UniqueKeyDetector, FileAction, DataframeList, DataframeDelete, HierarchyPath, PackagesList, JSONTools,
  DatabaseInput, DatabaseOutput, CompareDataframes, GenerateCalendar, DynamicGenerateCalendar, CorrelationMatrix,
  Switch, AutoColumnPosition, ChartGenerator, ComponentsList, MarkdownTools, TableToMarkdown, InternalRepositoryConnector, TOONTools, JSONToTOON, CreateJSONfromTable, ConcatenateColumns, AddMarkdownStyle, ValidateMarkdown,PackagesAction,
  SparkSqlInput, SparkConnectSession, SparkSqlNativeInput, SparkFileInput, SparkSqlTransform, SparkParquetOutput, SparkToPandas, SparkTableOutput, PandasToSpark, SparkSessionStop, SparkLimit, SparkDropDuplicates, SparkSelectColumns, SparkFilter, SparkOrderBy, SparkRepartition, SparkSample, SparkWithColumn, SparkCache, SparkDropColumns, SparkDistinct, SparkUnion, SparkJoin, SparkAggregate, SparkRenameColumns, SparkFillNa, SparkCast, SparkExplode, SparkWindow, SparkPivot, SparkUnpivot, SparkConcatColumns, SparkGenerateId, SparkCoalesce, SparkWhen, SparkStringReplace, SparkTrim, SparkSubstring, SparkDateTrunc, SparkSetOp, SparkDateFormat, SparkArrayOps, SparkCaseFold, SparkRound, SparkHash, SparkDateAdd, SparkLength, SparkSplit, SparkAbs, SparkGreatest, SparkDateDiff, SparkUnixTime, SparkMath, SparkInstr, SparkReverseRepeat, SparkIsNull, SparkStructGet, SparkApproxCountDistinct, SparkDescribe, SparkCheckpoint
} from './components';

// Export allow the component to be used as a base component in different packages. Order does not matter.
export {
  Aggregate, Console, ExcelFileOutput, CsvFileInput, JsonFileInput, JsonFileOutput, ExcelFileInput, CsvFileOutput, CustomTransformations, Filter, RestInput,
  SplitColumn, Deduplicate, ExpandList, Sample, Sort, RenameColumns, TypeConverter, Extract, GoogleSheetsInput, GoogleSheetsOutput, FilterColumns, Join, CombinedJoin,
  ParquetFileInput, ParquetFileOutput, PostgresInput, PostgresOutput, MySQLInput, MySQLOutput, XmlFileInput, XmlFileOutput, DateTimeConverter,
  EnvVariables, EnvFile, Transpose, Unite, Pivot, Annotation, ODBCInput, PdfTablesInput, Summary, LocalFileInput, FlattenJSON, ExplodeJSON, ValidateJSON,
  DataCleansing, GenerateIDColumn, SqlServerInput, OracleInput, Connection, SnowflakeInput, FormulaRow, InlineInput, S3FileOutput, S3FileInput,
  SnowflakeOutput, SqlServerOutput, OracleOutput, CustomInput, CustomOutput, FileUtils, FrequencyAnalysis, FormExample, UniqueKeyDetector, FileAction, DataframeList, DataframeDelete, HierarchyPath, PackagesList, CompareDataframes, GenerateCalendar, DynamicGenerateCalendar,
  Switch, CorrelationMatrix, AutoColumnPosition, ChartGenerator,ComponentsList, MarkdownTools, TableToMarkdown, InternalRepositoryConnector,TOONTools,JSONToTOON,CreateJSONfromTable, ConcatenateColumns, AddMarkdownStyle, ValidateMarkdown,PackagesAction,
  SparkSqlInput, SparkConnectSession, SparkSqlNativeInput, SparkFileInput, SparkSqlTransform, SparkParquetOutput, SparkToPandas, SparkTableOutput, PandasToSpark, SparkSessionStop, SparkLimit, SparkDropDuplicates, SparkSelectColumns, SparkFilter, SparkOrderBy, SparkRepartition, SparkSample, SparkWithColumn, SparkCache, SparkDropColumns, SparkDistinct, SparkUnion, SparkJoin, SparkAggregate, SparkRenameColumns, SparkFillNa, SparkCast, SparkExplode, SparkWindow, SparkPivot, SparkUnpivot, SparkConcatColumns, SparkGenerateId, SparkCoalesce, SparkWhen, SparkStringReplace, SparkTrim, SparkSubstring, SparkDateTrunc, SparkSetOp, SparkDateFormat, SparkArrayOps, SparkCaseFold, SparkRound, SparkHash, SparkDateAdd, SparkLength, SparkSplit, SparkAbs, SparkGreatest, SparkDateDiff, SparkUnixTime, SparkMath, SparkInstr, SparkReverseRepeat, SparkIsNull, SparkStructGet, SparkApproxCountDistinct, SparkDescribe, SparkCheckpoint
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: '@amphi/pipeline-components-core',
  description: 'Add components to Amphi',
  autoStart: true,
  requires: [ComponentManager],

  activate: (app: JupyterFrontEnd, componentService: any) => {
    console.log('Amphi extension pipeline-components-core is activated!');

    const g: any = globalThis as any;
    g.Amphi = g.Amphi || {};
    g.Amphi.BaseCoreComponent = BaseCoreComponent;
//⚠ Order does matter

    // Input
    componentService.addComponent(InlineInput.getInstance());
    componentService.addComponent(CsvFileInput.getInstance());
    componentService.addComponent(ExcelFileInput.getInstance());
    componentService.addComponent(ParquetFileInput.getInstance());
    componentService.addComponent(JsonFileInput.getInstance());
    componentService.addComponent(XmlFileInput.getInstance());
    componentService.addComponent(PdfTablesInput.getInstance());
    componentService.addComponent(S3FileInput.getInstance());
    componentService.addComponent(RestInput.getInstance());
    componentService.addComponent(GoogleSheetsInput.getInstance());
    componentService.addComponent(DatabaseInput.getInstance());
    componentService.addComponent(SparkSqlInput.getInstance());
    componentService.addComponent(SparkSqlNativeInput.getInstance());
    componentService.addComponent(SparkFileInput.getInstance());
    componentService.addComponent(CustomInput.getInstance());
    componentService.addComponent(GenerateCalendar.getInstance());
    // componentService.addComponent(PyGWalker.getInstance())
    // componentService.addComponent(Slider.getInstance())

    // Processors
    componentService.addComponent(RenameColumns.getInstance());
    componentService.addComponent(FilterColumns.getInstance());
    componentService.addComponent(Filter.getInstance());
    componentService.addComponent(Sort.getInstance());
    componentService.addComponent(SplitColumn.getInstance());
    componentService.addComponent(Extract.getInstance());
    componentService.addComponent(FormulaRow.getInstance());
    componentService.addComponent(ConcatenateColumns.getInstance());
    componentService.addComponent(CombinedJoin.getInstance());
    componentService.addComponent(Unite.getInstance());
    componentService.addComponent(Aggregate.getInstance());
    componentService.addComponent(Pivot.getInstance());
    componentService.addComponent(Transpose.getInstance());
    componentService.addComponent(Deduplicate.getInstance());
    componentService.addComponent(TypeConverter.getInstance());
    componentService.addComponent(DateTimeConverter.getInstance());
    componentService.addComponent(DataCleansing.getInstance());
    componentService.addComponent(Sample.getInstance());
    componentService.addComponent(CustomTransformations.getInstance());
    componentService.addComponent(GenerateIDColumn.getInstance());
    componentService.addComponent(JSONTools.getInstance());
    componentService.addComponent(MarkdownTools.getInstance());
    componentService.addComponent(TOONTools.getInstance());
    //componentService.addComponent(JSONToTOON.getInstance());
    componentService.addComponent(HierarchyPath.getInstance());
    componentService.addComponent(CompareDataframes.getInstance());
    componentService.addComponent(DynamicGenerateCalendar.getInstance());
    componentService.addComponent(Switch.getInstance());
    componentService.addComponent(AutoColumnPosition.getInstance());
    componentService.addComponent(SparkSqlTransform.getInstance());
    componentService.addComponent(SparkLimit.getInstance());
    componentService.addComponent(SparkDropDuplicates.getInstance());
    componentService.addComponent(SparkSelectColumns.getInstance());
    componentService.addComponent(SparkFilter.getInstance());
    componentService.addComponent(SparkOrderBy.getInstance());
    componentService.addComponent(SparkRepartition.getInstance());
    componentService.addComponent(SparkSample.getInstance());
    componentService.addComponent(SparkWithColumn.getInstance());
    componentService.addComponent(SparkCache.getInstance());
    componentService.addComponent(SparkDropColumns.getInstance());
    componentService.addComponent(SparkDistinct.getInstance());
    componentService.addComponent(SparkUnion.getInstance());
    componentService.addComponent(SparkJoin.getInstance());
    componentService.addComponent(SparkAggregate.getInstance());
    componentService.addComponent(SparkRenameColumns.getInstance());
    componentService.addComponent(SparkFillNa.getInstance());
    componentService.addComponent(SparkCast.getInstance());
    componentService.addComponent(SparkExplode.getInstance());
    componentService.addComponent(SparkWindow.getInstance());
    componentService.addComponent(SparkPivot.getInstance());
    componentService.addComponent(SparkUnpivot.getInstance());
    componentService.addComponent(SparkConcatColumns.getInstance());
    componentService.addComponent(SparkGenerateId.getInstance());
    componentService.addComponent(SparkCoalesce.getInstance());
    componentService.addComponent(SparkWhen.getInstance());
    componentService.addComponent(SparkStringReplace.getInstance());
    componentService.addComponent(SparkTrim.getInstance());
    componentService.addComponent(SparkSubstring.getInstance());
    componentService.addComponent(SparkDateTrunc.getInstance());
    componentService.addComponent(SparkSetOp.getInstance());
    componentService.addComponent(SparkDateFormat.getInstance());
    componentService.addComponent(SparkArrayOps.getInstance());
    componentService.addComponent(SparkCaseFold.getInstance());
    componentService.addComponent(SparkRound.getInstance());
    componentService.addComponent(SparkHash.getInstance());
    componentService.addComponent(SparkDateAdd.getInstance());
    componentService.addComponent(SparkLength.getInstance());
    componentService.addComponent(SparkSplit.getInstance());
    componentService.addComponent(SparkAbs.getInstance());
    componentService.addComponent(SparkGreatest.getInstance());
    componentService.addComponent(SparkDateDiff.getInstance());
    componentService.addComponent(SparkUnixTime.getInstance());
    componentService.addComponent(SparkMath.getInstance());
    componentService.addComponent(SparkInstr.getInstance());
    componentService.addComponent(SparkReverseRepeat.getInstance());
    componentService.addComponent(SparkIsNull.getInstance());
    componentService.addComponent(SparkStructGet.getInstance());
    componentService.addComponent(SparkApproxCountDistinct.getInstance());
    componentService.addComponent(SparkDescribe.getInstance());
    componentService.addComponent(SparkCheckpoint.getInstance());
    componentService.addComponent(SparkToPandas.getInstance());
    componentService.addComponent(PandasToSpark.getInstance());

    // Outputs
    componentService.addComponent(CsvFileOutput.getInstance());
    componentService.addComponent(JsonFileOutput.getInstance());
    componentService.addComponent(ExcelFileOutput.getInstance());
    componentService.addComponent(ParquetFileOutput.getInstance());
    componentService.addComponent(XmlFileOutput.getInstance());
    componentService.addComponent(GoogleSheetsOutput.getInstance());
    componentService.addComponent(S3FileOutput.getInstance());
    componentService.addComponent(DatabaseOutput.getInstance());
    componentService.addComponent(SparkParquetOutput.getInstance());
    componentService.addComponent(SparkTableOutput.getInstance());
    componentService.addComponent(Console.getInstance());
    componentService.addComponent(CustomOutput.getInstance());
	
	//Exploration
    componentService.addComponent(Summary.getInstance());
    componentService.addComponent(FrequencyAnalysis.getInstance());
    componentService.addComponent(UniqueKeyDetector.getInstance());
    componentService.addComponent(CorrelationMatrix.getInstance());
	componentService.addComponent(ChartGenerator.getInstance());
	
    // Settings
    componentService.addComponent(EnvVariables.getInstance());
    componentService.addComponent(EnvFile.getInstance());
    componentService.addComponent(Connection.getInstance());
    componentService.addComponent(SparkConnectSession.getInstance());
    componentService.addComponent(SparkSessionStop.getInstance());

    // Misc
    componentService.addComponent(FileAction.getInstance());
    componentService.addComponent(Annotation.getInstance());

    // Developer
    componentService.addComponent(FormExample.getInstance());
    componentService.addComponent(DataframeList.getInstance());
    componentService.addComponent(DataframeDelete.getInstance());
    componentService.addComponent(PackagesList.getInstance());
    componentService.addComponent(PackagesAction.getInstance());
    componentService.addComponent(ComponentsList.getInstance());
    componentService.addComponent(InternalRepositoryConnector.getInstance());
  }
};

export default plugin;