module.exports = {
    'git': {
        'requireCleanWorkingDir': false,
        'requireBranch': false,
        'requireUpstream': true,
        'requireCommits': false,
        'addUntrackedFiles': false,
        'commit': true,
        'commitMessage': 'Release v${version}',
        'tag': true,
        'tagName': 'v${version}',
        'tagAnnotation': 'v${version}',
        'push': true
    },
    'github': {
        'release': true,
        'releaseName': 'v${version}',
        'releaseNotes': null,
        'preRelease': false,
        'draft': false,
        'tokenRef': 'GITHUB_TOKEN',
        'assets': null,
        'host': null,
        'timeout': 0,
        'proxy': null,
        'skipChecks': false
    },
    'npm': {
        'publish': true,
        'publishPath': '.',
        'tag': null,
        'otp': null,
        'ignoreVersion': false, // 忽略版本
        'skipChecks': false,
        'timeout': 10
    },
    'hooks': {
        'after:release': [
            'echo Successfully released ${name} v${version} to ${repo.repository}.'
        ]
    }
};
