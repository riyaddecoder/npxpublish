#!/usr/bin/env node
import fs from "fs";
import path from "path";
import axios from "axios";
import AdmZip from "adm-zip";
import { execSync } from "child_process";
import inquirer from "inquirer";

const templateUrl =
  "zipped template url";

async function promptForProjectName() {
  let projectNamePrompt = await inquirer.prompt([
    {
      type: "input",
      name: "projectName",
      message: "Enter the project name:",
    },
  ]);
  while (!projectNamePrompt.projectName.trim()) {
    console.log("Project name is required");
    projectNamePrompt = await inquirer.prompt([
      {
        type: "input",
        name: "projectName",
        message: "Enter the project name:",
      },
    ]);
  }
  return projectNamePrompt.projectName;
}

async function promptForProjectPort() {
  let projectPortPrompt = await inquirer.prompt([
    {
      type: "input",
      name: "projectPort",
      message: "Enter the project port (ex:5001):",
    },
  ]);
  while (!projectPortPrompt.projectPort.trim()) {
    console.log("Project port is required");
    projectPortPrompt = await inquirer.prompt([
      {
        type: "input",
        name: "projectPort",
        message: "Enter the project port (ex:5001):",
      },
    ]);
  }
  return projectPortPrompt.projectPort;
}

async function downloadAndExtractTemplate() {
  try {
    const projectName = await promptForProjectName();
    const projectPort = await promptForProjectPort();
    const projectPath = path.join(process.cwd(), projectName);

    console.log("Downloading files...");
    const response = await axios.get(templateUrl, {
      responseType: "arraybuffer",
    });
    console.log("Extracting files...");
    const zip = new AdmZip(response.data);
    zip.extractAllTo(projectPath, true);

    // Delete the .git folder
    const gitFolderPath = path.join(projectPath, ".git");
    if (fs.existsSync(gitFolderPath)) {
      execSync(`rm -rf "${gitFolderPath}"`);
    }

    //
    //
    // Move the extracted content to the project root
    console.log("Updating files...");
    const files = fs.readdirSync(projectPath);
    files.forEach((file) => {
      fs.renameSync(path.join(projectPath, file), path.join(projectPath, file));
    });

    //Updating package json
    const packageJsonPath = path.join(projectPath, "package.json");
    let packageJson = await fs.promises.readFile(packageJsonPath, "utf8");
    packageJson = JSON.parse(packageJson);

    // Update package name
    packageJson.name = projectName;

    //Updating ports
    if (packageJson.scripts?.dev) {
      packageJson.scripts.dev = packageJson.scripts.dev.replace(
        "5001",
        projectPort
      );
    }
    if (packageJson.scripts?.preview) {
      packageJson.scripts.preview = packageJson.scripts.preview.replace(
        "5001",
        projectPort
      );
    }
    if (packageJson.scripts?.serve) {
      packageJson.scripts.serve = packageJson.scripts.serve.replace(
        "5001",
        projectPort
      );
    }

    //Writing to the file
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    process.chdir(projectPath);

    // Install dependencies
    // execSync(`npm install`);
    console.log("Project created successfully. Happy Coding :)");
  } catch (error) {
    console.error("Error creating project:", error);
    if (projectName) {
      try {
        fs.rmdirSync(projectPath, { recursive: true });
        console.log("Rollback successful: Project directory deleted.");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
    }
  }
}

downloadAndExtractTemplate();
