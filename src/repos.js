/**
 * File: repos.js
 * Created by busyhe on 2022/7/28 19:13.
 * Email: busyhe@qq.com
 * Description:
 */
const chalk = require('chalk');
const dayjs = require('dayjs');
const path = require('path');
const fs = require('fs');
const ini = require('ini');
const relativeTime = require('dayjs/plugin/relativeTime');
const logger = require('./utils/logger');
const LOCAL_REPOS = require('./repos.json');
const { isWindows, line } = require('./utils');

const HOME_PATH = process.env[isWindows() ? 'USERPROFILE' : 'HOME'];
const WFE_CLI_REPOS_RC = path.join(HOME_PATH, '.wfe_cli_repos_rc');
// default repos
const DEFAULT_REPO = 'wfe-templates';

dayjs.extend(relativeTime);

/**
 * show format all repos
 */
exports.showRepos = () => {
    const infos = [];
    const {
        current,
        repos
    } = this.getAllRepos();
    const keys = Object.keys(repos);
    const len = Math.max(...keys.map(key => key.length)) + 1;
    console.log();
    console.log('  Available Repos:');
    console.log();
    Object.keys(repos).forEach(function(key) {
        const item = repos[key];
        const prefix = current === key ? '* ' : '  ';
        infos.push('  ' + chalk.yellow(prefix) + chalk.blueBright(key) + line(key, len) + item.description);
    });
    infos.push('');
    infos.forEach(function(info) {
        console.log(info);
    });
};

/**
 * 设置当前repo
 * @param repoName
 */
exports.useRepo = (repoName) => {
    const { repos } = this.getAllRepos();
    if (!repos[repoName]) {
        logger.fatal('Not find repo ' + repoName);
        return;
    }
    let customRepos = this.getCustomRepos();
    customRepos = Object.assign({}, customRepos, {
        current: repoName
    });
    setCustomRepos(customRepos);
    logger.log(repoName + ' : ' + repos[repoName].description);
};

/**
 * 添加自定义repo
 * @param repoName
 * @param repo
 * @param template
 */
exports.createRepo = (name, description) => {
    const { repos } = this.getAllRepos();
    if (repos[name]) {
        console.log('');
        logger.fatal(`repo ${name} is existed`);
        return;
    }
    const customRepos = this.getCustomRepos();
    customRepos.repos[name] = { description };
    setCustomRepos(customRepos);
    logger.log(name + ' : ' + description);
};

/**
 * remove custom repo
 * @param repoName
 */
exports.removeRepo = (repoName) => {
    if (repoName === DEFAULT_REPO) {
        logger.fatal(`default repo ${DEFAULT_REPO} can't be removed`);
        return;
    }
    const { repos } = this.getAllRepos();
    if (!(repos && repos[repoName])) {
        logger.fatal(`repo ${repoName} is not existed`);
        return;
    }
    const customRepos = this.getCustomRepos();
    delete customRepos.repos[repoName];
    if (repoName === customRepos.current) {
        customRepos.current = DEFAULT_REPO;
        logger.log(`repo ${repoName} is removed, set default repo ${DEFAULT_REPO}`);
    }
    setCustomRepos(customRepos);
};

/**
 * get all repos (custom + official)
 * @returns {{wfe: {current: string, repos: string}}}
 */
exports.getAllRepos = function() {
    const customRepos = this.getCustomRepos();
    console.log('customRepos', customRepos);
    Object.assign(customRepos.repos, LOCAL_REPOS);
    return customRepos;
};

/**
 * get all custom repos
 * @returns {*|{current: string, repos: {}}}
 */
exports.getCustomRepos = () => {
    return fs.existsSync(WFE_CLI_REPOS_RC)
        ? ini.parse(fs.readFileSync(WFE_CLI_REPOS_RC, 'utf-8'))
        : {
            current: DEFAULT_REPO,
            repos: {}
        };
};

/**
 * set custom repo
 * @param repo
 */
function setCustomRepos(repos) {
    console.log('repos', repos);
    fs.writeFileSync(WFE_CLI_REPOS_RC, ini.stringify(repos));
}
