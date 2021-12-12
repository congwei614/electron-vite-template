'use strict'
process.env.NODE_ENV = 'production'

const { say } = require('cfonts')
const { sync } = require('del')

const chalk = require('chalk')
const rollup = require("rollup")
const { build } = require('vite')
const Multispinner = require('multispinner')

const rendererOptions = require('./vite.config')
const rollupOptions = require("./rollup.config")
const mainOpt = rollupOptions(process.env.NODE_ENV, "main");
const preloadOpt = rollupOptions(process.env.NODE_ENV, "preload")

const doneLog = chalk.bgGreen.white(' DONE ') + ' '
const errorLog = chalk.bgRed.white(' ERROR ') + ' '
const okayLog = chalk.bgBlue.white(' OKAY ') + ' '
const isCI = process.env.CI || false


if (process.env.BUILD_TARGET === 'web') web()
else unionBuild()

function clean() {
    sync(['dist/electron/main/*', 'dist/electron/renderer/*', 'dist/web/*', 'build/*', '!build/icons', '!build/lib', '!build/lib/electron-build.*', '!build/icons/icon.*'])
    console.log(`\n${doneLog}clear done`)
    if (process.env.BUILD_TARGET === 'onlyClean') process.exit()
}

function unionBuild() {
    greeting()
    if (process.env.BUILD_TARGET === 'clean' || process.env.BUILD_TARGET === 'onlyClean') clean()

    const tasks = ['main', 'preload', 'renderer']
    const m = new Multispinner(tasks, {
        preText: 'building',
        postText: 'process'
    })
    let results = ''

    m.on('success', () => {
        process.stdout.write('\x1B[2J\x1B[0f')
        console.log(`\n\n${results}`)
        console.log(`${okayLog}take it away ${chalk.yellow('`electron-builder`')}\n`)
        process.exit()
    })

    rollup.rollup(mainOpt)
        .then(build => {
            results += `${doneLog}MainProcess build success` + '\n\n'
            build.write(mainOpt.output).then(() => {
                m.success('main')
            })
        })
        .catch(error => {
            m.error('main')
            console.log(`\n  ${errorLog}failed to build main process`)
            console.error(`\n${error}\n`)
            process.exit(1)
        });

    rollup.rollup(preloadOpt)
        .then(build => {
            results += `${doneLog}preLoad build success` + '\n\n'
            build.write(preloadOpt.output).then(() => {
                m.success('preload')
            })
        })
        .catch(error => {
            m.error('preload')
            console.log(`\n  ${errorLog}failed to build preLoad`)
            console.error(`\n${error}\n`)
            process.exit(1)
        });

    build(rendererOptions).then(res => {
        results += `${doneLog}RendererProcess build success` + '\n\n'
        m.success('renderer')
    }).catch(err => {
        m.error('renderer')
        console.log(`\n  ${errorLog}failed to build renderer process`)
        console.error(`\n${err}\n`)
        process.exit(1)
    })
}

function web() {
    sync(['dist/web/*', '!.gitkeep'])
    build(rendererOptions).then(res => {
        console.log(`${doneLog}RendererProcess build success`)
        process.exit()
    })
}

function greeting() {
    const cols = process.stdout.columns
    let text = ''

    if (cols > 85) text = `let's-build`
    else if (cols > 60) text = `let's-|build`
    else text = false

    if (text && !isCI) {
        say(text, {
            colors: ['yellow'],
            font: 'simple3d',
            space: false
        })
    } else console.log(chalk.yellow.bold(`\n  let's-build`))
    console.log()
}