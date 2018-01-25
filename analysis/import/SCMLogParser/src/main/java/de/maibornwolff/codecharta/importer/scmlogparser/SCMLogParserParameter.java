package de.maibornwolff.codecharta.importer.scmlogparser;

import com.beust.jcommander.JCommander;
import com.beust.jcommander.Parameter;
import de.maibornwolff.codecharta.importer.scmlogparser.input.metrics.MetricsFactory;
import de.maibornwolff.codecharta.importer.scmlogparser.parser.LogParserStrategy;
import de.maibornwolff.codecharta.importer.scmlogparser.parser.git.GitLogNumstatParserStrategy;
import de.maibornwolff.codecharta.importer.scmlogparser.parser.git.GitLogNumstatRawParserStrategy;
import de.maibornwolff.codecharta.importer.scmlogparser.parser.git.GitLogParserStrategy;
import de.maibornwolff.codecharta.importer.scmlogparser.parser.git.GitLogRawParserStrategy;
import de.maibornwolff.codecharta.importer.scmlogparser.parser.svn.SVNLogParserStrategy;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static de.maibornwolff.codecharta.importer.scmlogparser.InputFormatNames.*;

public class SCMLogParserParameter {
    private static final List<String> nonChurnMetrics = Arrays.asList(
            "number_of_authors",
            "number_of_commits",
            "range_of_weeks_with_commits",
            "successive_weeks_of_commits",
            "weeks_with_commits"
    );
    private final JCommander jc;
    @Parameter(description = "[file]")
    private List<String> files = new ArrayList<>();
    @Parameter(names = {"-o", "--outputFile"}, description = "Output File (or empty for stdout)")
    private String outputFile = "";
    @Parameter(names = {"-p", "--projectName"}, description = "Project name")
    private String projectName = "SCMLogParser";
    @Parameter(names = {"--git"}, description = "Analysis of git log, equivalent --input-format GIT_LOG")
    private boolean gitLog = false;
    @Parameter(names = {"--svn"}, description = "Analysis of svn log, equivalent --input-format SVN_LOG")
    private boolean svnLog = false;
    @Parameter(names = {"--input-format"}, description = "Input for parsing")
    private InputFormatNames inputFormatNames;
    @Parameter(names = {"--add-author"}, description = "Add an array of authors to every file")
    private boolean addAuthor = false;
    @Parameter(names = {"-h", "--help"}, description = "This help text", help = true)
    private boolean help = false;

    public SCMLogParserParameter(String[] args) {
        this.jc = new JCommander(this, args);
    }

    public List<String> getFiles() {
        return files;
    }

    public boolean isHelp() {
        return help;
    }

    public String getOutputFile() {
        return outputFile;
    }

    public boolean isAddAuthor() {
        return addAuthor;
    }

    public void printUsage() {
        jc.usage();

        String infoFormat = "   -> %s : \"%s\".";

        System.out.println("  Log creation via:");
        System.out.println(String.format(infoFormat, GIT_LOG, "git log --name-status --topo-order"));
        System.out.println(String.format(infoFormat, GIT_LOG_NUMSTAT, "git log --numstat --topo-order"));
        System.out.println(String.format(infoFormat, GIT_LOG_NUMSTAT_RAW, "git log --numstat --raw --topo-order"));
        System.out.println(String.format(infoFormat, GIT_LOG_RAW, "git log --raw --topo-order"));
        System.out.println(String.format(infoFormat, SVN_LOG, "svn log --verbose"));
        System.out.println("");
    }

    public LogParserStrategy getLogParserStrategy() {
        if (gitLog && !svnLog) {
            return new GitLogParserStrategy();
        } else if (svnLog && !gitLog) {
            return new SVNLogParserStrategy();
        } else if (svnLog && gitLog) {
            throw new IllegalArgumentException("only one of --git or --svn must be set");
        }
        switch (inputFormatNames) {
            case GIT_LOG:
                return new GitLogParserStrategy();
            case GIT_LOG_NUMSTAT:
                return new GitLogNumstatParserStrategy();
            case GIT_LOG_RAW:
                return new GitLogRawParserStrategy();
            case GIT_LOG_NUMSTAT_RAW:
                return new GitLogNumstatRawParserStrategy();
            case SVN_LOG:
                return new SVNLogParserStrategy();
            default:
                throw new IllegalArgumentException("--git or --svn or --input-format must specified");
        }
    }

    public MetricsFactory getMetricsFactory() {
        switch (inputFormatNames) {
            case GIT_LOG:
            case GIT_LOG_RAW:
            case SVN_LOG:
                return new MetricsFactory(nonChurnMetrics);
            default:
                return new MetricsFactory();
        }
    }

    public String getProjectName() {
        return projectName;
    }
}
