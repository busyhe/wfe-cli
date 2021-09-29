/**
 * Created by busyhe on 2021/9/29.
 * Email: busyhe@qq.com
 * Description:
 */
const chalk = require('chalk');

module.exports = {
    error: (str) => {
        console.log(chalk.red(str))
    }
}
