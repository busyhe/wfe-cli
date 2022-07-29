/**
 * Created by busyhe on 2021/9/29.
 * Email: busyhe@qq.com
 * Description:
 */
exports.isWindows = () => {
    return process.platform === 'win32';
};

exports.line = (str, len) => {
    const line = new Array(Math.max(2, len - str.length + 2)).join('-');
    return ' ' + line + ' ';
};
