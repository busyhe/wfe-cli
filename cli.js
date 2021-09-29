#!/usr/bin/env node

/**
 * Created by busyhe on 2021/9/29.
 * Email: busyhe@qq.com
 * Description:
 */
const fs = require('fs');
const path = require('path');
const ini = require('ini');
const chalk = require('chalk');
const {Command} = require('commander');
const program = new Command();
const {isWindows} = require('./utils');
const logger = require('./utils/log');
const LOCAL_REPOS = require('./repos.json');

const HOME_PATH = process.env[isWindows() ? 'USERPROFILE' : 'HOME'];
const WFE_CLI_REPOS_RC = path.join(HOME_PATH, '.wfe_cli_repos_rc');

program.version(require('./package').version);

program.usage('<command> [options]');

program.command('init', 'generate a new project from a template');

program.command('list', 'list available official templates');

// reposProgram
const reposProgram = program.command('repos');

reposProgram
    .description('list all the repos')
    .command('ls')
    .action(showRepos);

reposProgram
    .description('Change repo to current')
    .command('use <template>')
    .action(useRepo);

if (process.argv.length === 2) {
    program.outputHelp();
}

program.parse(process.argv);

process.on('exit', () => {
    console.log();
});

/**
 * 显示repos列表
 */
function showRepos() {
    const infos = [];
    const allRepos = getRepos();
    const currentRepo = getCurrentRepo();
    const keys = Object.keys(allRepos);
    const len = Math.max(...keys.map(key => key.length)) + 1;
    const templateLen = Math.max(...Object.values(allRepos).map(i => i.templates.length));
    console.log();
    console.log('  Available templates:');
    console.log();
    Object.keys(allRepos).forEach(function (key) {
        const item = allRepos[key];
        const prefix = currentRepo === key ? '* ' : '  ';
        infos.push('  ' + chalk.yellow(prefix) + ' ' + chalk.blue(key) + line(key, len) + item.templates + line(item.templates, templateLen) + item.repos);
    });
    infos.push('');
    infos.forEach(function (info) {
        console.log(info);
    });
}

/**
 * 设置当前repo
 * @param repoName
 */
function useRepo(repoName) {
    const allRepos = getRepos();
    const {repos: customRepos, current: currentRepo} = getCustomRepos();
    if (!allRepos[repoName]) {
        console.log('');
        logger.error('Not find repo ' + repoName);
    }
}

/**
 * 获取全部repos
 * @returns {{wfe: {templates: string, repos: string}}}
 */
function getRepos() {
    const {repos: customRepos} = getCustomRepos();
    return Object.assign({}, LOCAL_REPOS, customRepos);
}

/**
 * 获取当前选择的repo
 * @returns {string}
 */
function getCurrentRepo() {
    const {current} = getCustomRepos();
    return current;
}

function line(str, len) {
    const line = new Array(Math.max(2, len - str.length + 2)).join('-');
    return ' ' + line + ' ';
}

/**
 * 获取自定义repos
 * @returns {*|{current: string, repos: {}}}
 */
function getCustomRepos() {
    return fs.existsSync(WFE_CLI_REPOS_RC) ? ini.parse(fs.readFileSync(WFE_CLI_REPOS_RC, 'utf-8')) : {
        current: 'wfe',
        repos: {}
    };
}

/**
 * 设置自定义repos
 * @param repo
 */
function setCustomRepos(repo) {
    const repos = getCustomRepos();
    fs.writeFileSync(WFE_CLI_REPOS_RC, ini.stringify(repos));
}
