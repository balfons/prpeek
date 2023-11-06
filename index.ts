import terminalLink from "terminal-link";
import chalk from "chalk";
import boxen from "boxen";
import { Command } from "commander";
const program = new Command();

program
  .description("Show status of relevant pull requests live")
  .requiredOption(
    "-r, --repo <repo>",
    "Repository url to target: [HOST/]OWNER/REPO"
  )
  .option("-i, --interval <interval>", "Update interval in seconds", "5");

program.parse();

const { repo, interval } = program.opts();

const intervalAsMillis = Number(interval * 1000);

if (isNaN(intervalAsMillis)) {
  program.error("Interval must be a number");
}

const runGhCommand = (repoUrl: string) => {
  const env = { ...process.env, CLICOLOR_FORCE: "1", GH_PAGER: "" };
  const ghPrCommand = ["gh", "pr", "status", "--repo", repoUrl];
  try {
    return Bun.spawnSync(ghPrCommand, {
      env,
    });
  } catch (error: any) {
    if (error.code === 'ERR_INVALID_ARG_TYPE') {
      throw 'GitHub CLI needs to be installed in order to run prpeek: https://github.com/cli/cli#installation';
    } else {
      throw error;
    }
  }
};

const getPrLink = (prNumber: string) => {
  return `${repo}/pull/${prNumber}`;
};

const formatOutput = (text: string) => {
  const formattedWithLinks = text.replace(
    /^(.*#(\d+).*)$/gm,
    (match, line, prNumber) => {
      const link = terminalLink(line.trimStart(), getPrLink(prNumber));
      return `  ${link}`;
    }
  );

  const lines = formattedWithLinks.split("\n");
  const title = lines[1];

  lines.splice(0, 3);
  const body = lines.join("\n");

  return { title, body };
};

const getDate = () => {
  const date = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    timeStyle: "medium",
    hour12: false,
  };

  const formattedDate = new Intl.DateTimeFormat("se-sv", dateOptions).format(
    date
  );
  const formattedTime = new Intl.DateTimeFormat("se-sv", timeOptions).format(
    date
  );

  return `${formattedDate} ${formattedTime}`;
};

while (true) {
  const ghCommand = runGhCommand(repo);
  const ghCommandOuput = await new Response(ghCommand.stdout).text();
  const date = chalk.dim(`Last updated: ${getDate()}`);

  console.clear();
  
  const { body, title } = formatOutput(ghCommandOuput);
  const output = `${body}\n${date}`;
  
  console.log(boxen(output, { padding: 1, borderColor: 'magenta', title: title }));

  await Bun.sleep(intervalAsMillis);
}