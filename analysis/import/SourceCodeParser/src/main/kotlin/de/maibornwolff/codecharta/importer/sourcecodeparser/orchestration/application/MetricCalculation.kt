package de.maibornwolff.codecharta.importer.sourcecodeparser.orchestration.application

import de.maibornwolff.codecharta.importer.sourcecodeparser.core.domain.metrics.DetailedMetricTable
import de.maibornwolff.codecharta.importer.sourcecodeparser.oop.application.OopEntryPoint
import de.maibornwolff.codecharta.importer.sourcecodeparser.oop.domain.metrics.OopLanguage
import de.maibornwolff.codecharta.importer.sourcecodeparser.orchestration.domain.metrics.OverviewMetric


private val oopEntryPoint = OopEntryPoint()
private val defaultEntryPoint = DefaultEntryPoint()

fun calculateDetailedMetrics(detailedSourceProvider: DetailedSourceProvider): DetailedMetricTable {
    val singleSource = detailedSourceProvider.readSource()
    return when(singleSource.sourceDescriptor.language){
        OopLanguage.JAVA -> oopEntryPoint.calculateSingleMetrics(singleSource)
        else -> defaultEntryPoint.fileSummary(singleSource)
    }
}

fun calculateOverviewMetrics(overviewSourceProvider: OverviewSourceProvider): OverviewMetric {
    val tableMetrics = overviewSourceProvider
            .readSources()
            .filter { it.sourceDescriptor.language == OopLanguage.JAVA }
            .map { oopEntryPoint.calculateSingleMetrics(it) }

    return OverviewMetric(tableMetrics.map { it.sum })
}