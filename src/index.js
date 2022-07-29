#!/usr/bin/env node
/**
 * Created by busyhe on 2021/9/29.
 * Email: busyhe@qq.com
 * Description:
 */
const inquirer = require('inquirer');
const { Command } = require('commander');
const program = new Command();
const Package = require('../package.json');
const {
    initProject,
    showTemplates
} = require('./templates');
const {
    showRepos,
    createRepo,
    useRepo,
    removeRepo
} = require('./repos');

inquirer.registerPrompt('checkbox-plus', require('inquirer-checkbox-plus-prompt'));

program.version(Package.version);
program.usage('<command> [options]');

program
    .command('init <project>')
    .description('generate a new project from a template')
    .option('-t, --template <template>', 'by template')
    .action(initProject);
program
    .command('list')
    .alias('ls')
    .description('list available official templates')
    .action(showTemplates);

// repos command manage multiple sources
const reposProgram = program.command('repos');
reposProgram
    .command('list')
    .alias('ls')
    .action(showRepos);
reposProgram
    .command('use <template>')
    .action(useRepo);
reposProgram
    .command('add <name> <description>')
    .action(createRepo);
reposProgram
    .command('del <name>')
    .action(removeRepo);
program.parse(process.argv);

process.on('exit', () => {
    console.log();
});
