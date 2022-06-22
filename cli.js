#!/usr/bin/env node
/**
 * Created by busyhe on 2021/9/29.
 * Email: busyhe@qq.com
 * Description:
 */
const fs = require('fs')
const path = require('path')
const ini = require('ini')
const chalk = require('chalk')
const inquirer = require('inquirer')
const { Command } = require('commander')
const program = new Command()
const Package = require('./package.json')
const { isWindows } = require('./utils')
const logger = require('./lib/logger')
const LOCAL_REPOS = require('./repos.json')
const axios = require('axios')
const dayjs = require('dayjs')
const relativeTime = require('dayjs/plugin/relativeTime')
const ora = require('ora')
const { existsSync: exists } = require('fs')
const { sync: rm } = require('rimraf')
const download = require('download-git-repo')
const generate = require('./lib/generate')
const home = require('user-home')
const localPath = require('./lib/local-path')

dayjs.extend(relativeTime)
inquirer.registerPrompt('checkbox-plus', require('inquirer-checkbox-plus-prompt'))

const HOME_PATH = process.env[isWindows() ? 'USERPROFILE' : 'HOME']
const WFE_CLI_REPOS_RC = path.join(HOME_PATH, '.wfe_cli_repos_rc')
const DEFAULT_REPO = 'wfe' // 默认repo
const KFZ_TEMPLATES = 'fe-templates' // 私有化库地址

program.version(Package.version)

program.usage('<command> [options]')

program
    .description('generate a new project from a template')
    .command('init <project>')
    .option('-t, --template <template>', 'by template')
    .action(initProject)

program
    .command('list')
    .alias('ls')
    .description('list available official templates')
    .action(showTemplates)

// repos command manage multiple sources
const reposProgram = program.command('repos')

reposProgram
    .command('list')
    .alias('ls')
    .action(showRepos)

reposProgram
    .command('use <template>')
    .action(useRepo)

reposProgram
    .command('add <name> <repo> [template]')
    .action(addRepo)

reposProgram
    .command('del <name>')
    .action(removeRepo)

if (process.argv.length === 2) {
    program.outputHelp()
}

program.parse(process.argv)

process.on('exit', () => {
    console.log()
})

async function initProject(projectName, opts) {
    let { template } = opts
    if (!template) {
        const templatesRes = await getRepoTemplates()
        const templatesData = templatesRes.data
        const len = Math.max(...templatesData.map(key => key.name.length)) + 1
        const templates = templatesData.map(item => {
            return {
                name: item.name + chalk.gray(line(item.name, len) + item.description) + ' ' + chalk.gray(dayjs(item.updated_at || item.last_activity_at).fromNow()),
                value: item.name
            }
        })
        const { template: selectTmp } = await inquirer.prompt([
            {
                type: 'list',
                name: 'template',
                message: 'create project should by a template?',
                choices: templates
            }]
        )
        template = selectTmp
    } else {
        if (localPath.isLocalPath(template)) {
            const templatePath = localPath.getTemplatePath(template)
            if (exists(templatePath)) {
                generate(projectName, templatePath, path.resolve(projectName), err => {
                    if (err) logger.fatal(err)
                    console.log()
                    logger.success('Generated "%s".', projectName)
                })
            } else {
                logger.fatal('Local template "%s" not found.', template)
            }
            return
        }
    }
    downloadAndGenerate(projectName, template)
}

function downloadAndGenerate(projectName, template) {
    const repo = getCurrentRepo()
    const isKfz = repo.templates === KFZ_TEMPLATES
    const inPlace = !projectName || projectName === '.'
    const name = inPlace ? path.relative('../', process.cwd()) : projectName
    const tmp = path.join(home, `.${repo.templates}`, template.replace(/[/:]/g, '-')) // 本地存储模板路径
    const to = path.resolve(projectName || '.') // 目标路径
    template = isKfz ? `direct:git@git.zuoshouyisheng.com:frontend/fe-cli/${repo.templates}/${template}.git` : `${repo.templates}/${template}`

    const spinner = ora('downloading template')
    spinner.start()
    // Remove if local template exists
    if (exists(tmp)) rm(tmp)
    download(template, tmp, {
        clone: isKfz // 如果使用私有化模板库则clone
    }, err => {
        spinner.stop()
        if (err) logger.fatal('Failed to download repo ' + template + ': ' + err.message.trim())
        generate(name, tmp, to, err => {
            if (err) logger.fatal(err)
            console.log()
            logger.success('Generated "%s".', name)
        })
    })
}

async function getRepoTemplates() {
    const currentRepo = getCurrentRepo()
    return axios.get(currentRepo.repos, {}, {
        headers: {
            'User-Agent': Package.name
        }
    })
}

/**
 * 显示模板列表
 */
async function showTemplates() {
    const res = await getRepoTemplates()
    const requestBody = res.data
    if (Array.isArray(requestBody)) {
        console.log()
        console.log('  Available templates:')
        console.log()
        requestBody.forEach(repo => {
            console.log(
                '  ' + chalk.yellow('★') +
                '  ' + chalk.blue(repo.name) +
                ' - ' + repo.description +
                '  ' + chalk.gray(dayjs(repo.updated_at || repo.last_activity_at).fromNow()))
        })
        console.log()
        res.headers['x-ratelimit-remaining'] && console.log(chalk.gray(`  Ratelimit-Remaining: ${res.headers['x-ratelimit-remaining']}`))
    } else {
        // 速率限制
        if (requestBody.message.indexOf('API rate limit exceeded') >= 0) {
            console.log(chalk.yellow(`ratelimit-reset: ${dayjs.unix(res.headers['x-ratelimit-reset']).format('YYYY-MM-DD HH:mm:ss')}`))
            console.log()
        }
        console.log(chalk.red(requestBody.message))
    }
}

/**
 * 显示repos列表
 */
function showRepos() {
    const infos = []
    const allRepos = getRepos()
    const { current } = getCustomRepos()
    const keys = Object.keys(allRepos)
    const len = Math.max(...keys.map(key => key.length)) + 1
    const templateLen = Math.max(...Object.values(allRepos).map(i => i.templates.length))
    console.log()
    console.log('  Available Repos:')
    console.log()
    Object.keys(allRepos).forEach(function(key) {
        const item = allRepos[key]
        const prefix = current === key ? '* ' : '  '
        infos.push('  ' + chalk.yellow(prefix) + ' ' + chalk.blue(key) + line(key, len) + item.templates + line(item.templates, templateLen) + item.repos)
    })
    infos.push('')
    infos.forEach(function(info) {
        console.log(info)
    })
}

/**
 * 设置当前repo
 * @param repoName
 */
function useRepo(repoName) {
    const allRepos = getRepos()
    if (!allRepos[repoName]) {
        console.log('')
        logger.fatal('Not find repo ' + repoName)
        return
    }
    let customRepos = getCustomRepos()
    customRepos = Object.assign({}, customRepos, {
        current: repoName
    })
    setCustomRepos(customRepos)
    logger.log(repoName + ' : ' + allRepos[repoName].templates + '-' + allRepos[repoName].repos)
}

/**
 * 添加自定义repo
 * @param repoName
 * @param repo
 * @param template
 */
function addRepo(repoName, repo, template = repoName) {
    const allRepos = getRepos()
    if (allRepos[repoName]) {
        console.log('')
        logger.fatal(`repo ${repoName} is existed`)
        return
    }
    const customRepos = getCustomRepos()
    customRepos.repos[repoName] = {
        templates: template,
        repos: repo
    }
    setCustomRepos(customRepos)
    logger.log(template + ' : ' + template + '-' + repo)
}

function removeRepo(repoName) {
    const allRepos = getRepos()
    if (!allRepos[repoName]) {
        console.log('')
        logger.fatal(`repo ${repoName} is not existed`)
        return
    }
    const customRepos = getCustomRepos()
    if (!customRepos.repos[repoName]) {
        console.log('')
        logger.fatal(`custom repo ${repoName} is not existed`)
        return
    }
    delete customRepos.repos[repoName]
    if (repoName === customRepos.current) {
        customRepos.current = DEFAULT_REPO
        logger.log('current repo is ' + repoName + ' : ' + allRepos[repoName].templates + '-' + allRepos[repoName].repos)
    }
    setCustomRepos(customRepos)
}

/**
 * 获取全部repos
 * @returns {{wfe: {templates: string, repos: string}}}
 */
function getRepos() {
    const { repos: customRepos } = getCustomRepos()
    return Object.assign({}, LOCAL_REPOS, customRepos)
}

function getCurrentRepo() {
    const { current, repos = {} } = getCustomRepos()
    const allRepos = getRepos()
    if (allRepos[current]) return allRepos[current]
    setCustomRepos({
        current: DEFAULT_REPO,
        repos
    })
    return LOCAL_REPOS[DEFAULT_REPO]
}

function line(str, len) {
    const line = new Array(Math.max(2, len - str.length + 2)).join('-')
    return ' ' + line + ' '
}

/**
 * 获取自定义repos
 * @returns {*|{current: string, repos: {}}}
 */
function getCustomRepos() {
    const customRepos = fs.existsSync(WFE_CLI_REPOS_RC)
        ? ini.parse(fs.readFileSync(WFE_CLI_REPOS_RC, 'utf-8'))
        : {
                current: DEFAULT_REPO,
                repos: {}
            }
    if (!customRepos.repos) customRepos.repos = {}
    return customRepos
}

/**
 * 设置自定义repos
 * @param repo
 */
function setCustomRepos(repos) {
    fs.writeFileSync(WFE_CLI_REPOS_RC, ini.stringify(repos))
}
