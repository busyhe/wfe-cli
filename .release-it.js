module.exports = {
    'git': {
        'changelog': 'npx auto-changelog --stdout --commit-limit false --unreleased --template changelog.hbs',
        'requireCleanWorkingDir': true,
        'requireBranch': false,
        'requireUpstream': true,
        'requireCommits': false,
        'addUntrackedFiles': false,
        'commit': true,
        'commitMessage': 'Release v${version}',
        'tag': true,
        'tagName': 'v${version}',
        'tagAnnotation': 'v${version}',
        'push': true,
        'pushArgs': [
            '--follow-tags'
        ],
        'pushRepo': ''
    },
    gitlab: {
        release: true,
        releaseName: 'v${version}',
        tokenRef: 'KFZ_GITLAB_TOKEN',
        assets: [
            'dist/*.zip'
        ]
    },
    'github': {
        'release': true,
        'releaseName': 'Release ${version}',
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
        'ignoreVersion': false,
        'skipChecks': false,
        'timeout': 10
    },
    'plugins': {
        '@release-it/keep-a-changelog': {
            'strictLatest': false,
            'filename': 'CHANGELOG.md'
        }
    },
    'hooks': {
        'after:bump': 'npx auto-changelog -p',
        'after:release': [
            'echo Successfully released ${name} v${version} to ${repo.repository}.'
        ]
    }
};