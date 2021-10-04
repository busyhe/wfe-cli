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
const package = require('./package.json')
const {isWindows} = require('./utils');
const logger = require('./lib/logger');
const LOCAL_REPOS = require('./repos.json');
const request = require('request');
const dayjs = require('dayjs');
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

const HOME_PATH = process.env[isWindows() ? 'USERPROFILE' : 'HOME'];
const WFE_CLI_REPOS_RC = path.join(HOME_PATH, '.wfe_cli_repos_rc');
const DEFAULT_REPO = 'wfe';

program.version(package.version);

program.usage('<command> [options]');

program
    .description('generate a new project from a template')
    .command('init')
    .action(initProject)

program
    .description('list available official templates')
    .command('list')
    .action(showTemplates);

const reposProgram = program.command('repos');

reposProgram
    .command('ls')
    .action(showRepos);

reposProgram
    .command('use <template>')
    .action(useRepo);

reposProgram
    .command('add <name> <repo> [template]')
    .action(addRepo);

if (process.argv.length === 2) {
    program.outputHelp();
}

program.parse(process.argv);

process.on('exit', () => {
    console.log();
});

function initProject() {
}

/**
 * 显示模板列表
 */
function showTemplates() {
    const currentRepo = getCurrentRepo();
    request({
        url: currentRepo.repos,
        headers: {
            'User-Agent': package.name
        }
    }, (err, res, body) => {
        if (err) logger.fatal(err);
        const requestBody = JSON.parse(body);
        if (Array.isArray(requestBody)) {
            console.log();
            console.log('  Available templates:');
            console.log();
            requestBody.forEach(repo => {
                console.log(
                    '  ' + chalk.yellow('★') +
                    '  ' + chalk.blue(repo.name) +
                    ' - ' + repo.description +
                    '  ' + chalk.gray(dayjs(repo.updated_at || repo.last_activity_at).fromNow()));
            });
            console.log();
            res.headers['x-ratelimit-remaining'] && console.log(chalk.gray(`  Ratelimit-Remaining: ${res.headers['x-ratelimit-remaining']}`));
        } else {
            // 速率限制
            if (requestBody.message.indexOf('API rate limit exceeded') >= 0) {
                console.log(chalk.yellow(`ratelimit-reset: ${dayjs.unix(res.headers['x-ratelimit-reset']).format('YYYY-MM-DD HH:mm:ss')}`));
                console.log();
            }
            console.log(chalk.red(requestBody.message));
        }
    });
}

/**
 * 显示repos列表
 */
function showRepos() {
    const infos = [];
    const allRepos = getRepos();
    const {current} = getCustomRepos();
    const keys = Object.keys(allRepos);
    const len = Math.max(...keys.map(key => key.length)) + 1;
    const templateLen = Math.max(...Object.values(allRepos).map(i => i.templates.length));
    console.log();
    console.log('  Available Repos:');
    console.log();
    Object.keys(allRepos).forEach(function (key) {
        const item = allRepos[key];
        const prefix = current === key ? '* ' : '  ';
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
    if (!allRepos[repoName]) {
        console.log('');
        logger.error('Not find repo ' + repoName);
        return;
    }
    let customRepos = getCustomRepos();
    customRepos = Object.assign({}, customRepos, {
        current: repoName
    });
    setCustomRepos(customRepos);
    logger.log(repoName + ' : ' + allRepos[repoName].repos)
}

/**
 * 添加自定义repo
 * @param repoName
 * @param repo
 * @param template
 */
function addRepo(repoName, repo, template = repoName) {
    const allRepos = getRepos();
    if (allRepos[repoName]) {
        console.log('');
        logger.error(`repo ${repoName} is existed`);
        return;
    }
    const customRepos = getCustomRepos();
    customRepos.repos[repoName] = {
        templates: template,
        repos: repo
    };
    setCustomRepos(customRepos);
}

/**
 * 获取全部repos
 * @returns {{wfe: {templates: string, repos: string}}}
 */
function getRepos() {
    const {repos: customRepos} = getCustomRepos();
    return Object.assign({}, LOCAL_REPOS, customRepos);
}

function getCurrentRepo() {
    const {current, repos = {}} = getCustomRepos();
    const allRepos = getRepos();
    if (allRepos[current]) return allRepos[current];
    setCustomRepos({
        current: DEFAULT_REPO,
        repos
    });
    return LOCAL_REPOS[DEFAULT_REPO];
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
    const customRepos = fs.existsSync(WFE_CLI_REPOS_RC) ? ini.parse(fs.readFileSync(WFE_CLI_REPOS_RC, 'utf-8')) : {
        current: DEFAULT_REPO,
        repos: {}
    };
    if (!customRepos.repos) customRepos.repos = {};
    return customRepos;
}

/**
 * 设置自定义repos
 * @param repo
 */
function setCustomRepos(repos) {
    fs.writeFileSync(WFE_CLI_REPOS_RC, ini.stringify(repos));
}
