/**
 * File: templates.js
 * Created by busyhe on 2022/7/28 19:23.
 * Email: busyhe@qq.com
 * Description:
 */
const chalk = require('chalk');
const dayjs = require('dayjs');
const inquirer = require('inquirer');
const { existsSync: exists } = require('fs');
const path = require('path');
const axios = require('axios');
const home = require('user-home');
const ora = require('ora');
const { sync: rm } = require('rimraf');
const download = require('download-git-repo');
const logger = require('./utils/logger');
const generate = require('./utils/generate');
const localPath = require('./utils/local-path');
const { line } = require('./utils');
const Package = require('../package.json');
const { getAllRepos } = require('./repos');

exports.initProject = async function(projectName, opts) {
    let { template } = opts;
    if (!template) {
        const templatesRes = await getRepoTemplates();
        const templatesData = templatesRes.data;
        const len = Math.max(...templatesData.map(key => key.name.length)) + 1;
        const templates = templatesData.map(item => {
            return {
                name: item.name + chalk.gray(line(item.name, len) + item.description) + ' ' + chalk.gray(dayjs(item.updated_at || item.last_activity_at).fromNow()),
                value: item.name
            };
        });
        const { template: selectTmp } = await inquirer.prompt([
            {
                type: 'list',
                name: 'template',
                message: 'create project should by a template?',
                choices: templates
            }]
        );
        template = selectTmp;
    } else {
        if (localPath.isLocalPath(template)) {
            const templatePath = localPath.getTemplatePath(template);
            if (exists(templatePath)) {
                generate(projectName, templatePath, path.resolve(projectName), err => {
                    if (err) logger.fatal(err);
                    console.log();
                    logger.success('Generated "%s".', projectName);
                });
            } else {
                logger.fatal('Local template "%s" not found.', template);
            }
            return;
        }
    }
    downloadAndGenerate(projectName, template);
};

exports.showTemplates = async function() {
    const res = await getRepoTemplates();
    const requestBody = res.data;
    if (Array.isArray(requestBody)) {
        console.log();
        console.log('  Available templates:');
        console.log();
        requestBody.forEach(repo => {
            console.log(
                '  ' + chalk.yellow('★') +
                '  ' + chalk.blueBright(repo.name) +
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
};

async function getRepoTemplates() {
    const { current } = getAllRepos();
    const repoAddress = `https://api.github.com/users/${current}/repos`;
    return axios.get(repoAddress, {}, {
        headers: {
            'User-Agent': Package.name
        }
    });
};

function downloadAndGenerate(projectName, template) {
    const {
        current,
        repos = {}
    } = this.getAllRepos();
    if (!repos[current]) {
        logger.fatal(`current repo ${current} is not existed`);
        return;
    }
    const inPlace = !projectName || projectName === '.';
    const name = inPlace ? path.relative('../', process.cwd()) : projectName;
    const tmp = path.join(home, `.${current}`, template.replace(/[/:]/g, '-'));
    const to = path.resolve(projectName || '.');
    template = `${current}/${template}`;

    const spinner = ora('downloading template');
    spinner.start();
    // Remove if local template exists
    if (exists(tmp)) rm(tmp);
    download(template, tmp, {
        clone: false // if private, clone will fail, change value to true to ignore
    }, err => {
        spinner.stop();
        if (err) logger.fatal('Failed to download repo ' + template + ': ' + err.message.trim());
        generate(name, tmp, to, err => {
            if (err) logger.fatal(err);
            console.log();
            logger.success('Generated "%s".', name);
        });
    });
};
