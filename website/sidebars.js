function getApiItems(source, types) {
  return [
    {
      type: 'doc',
      id: `api/${source}/index`,
      label: 'Table of contents',
    },
    ...types.map((type) => ({
      type: 'category',
      label: `${type[0].toUpperCase()}${type.slice(1)}`,
      items: [
        {
          type: 'autogenerated',
          dirName: `api/${source}/${type}`,
        },
      ],
    })),
  ];
}

module.exports = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Documentation',
      items: [
        'about',
        'getting-started',
        'known-issues',
        'web-support',
        {
          type: 'category',
          label: 'Code Splitting',
          items: [
            'code-splitting/concepts',
            'code-splitting/usage',
            'code-splitting/glossary',
            'code-splitting/guide-async-chunks',
            'code-splitting/local-vs-remote-chunks',
            'code-splitting/caching-versioning',
            'code-splitting/react-navigation',
            'code-splitting/code-push',
          ],
        },
        {
          type: 'category',
          label: 'Migration guides',
          items: [
            'migration-guides/repack-v1-to-v2',
            'migration-guides/repack-v2-to-v3',
          ],
        },
      ],
    },
  ],
  configuration: [
    {
      type: 'category',
      label: 'Configuration',
      items: ['configuration/webpack-config', 'configuration/templates'],
    },
    {
      type: 'category',
      label: 'Loaders',
      items: ['configuration/loaders/assets-loader'],
    },
    {
      type: 'category',
      label: 'Guides',
      items: ['configuration/guides/svg', 'configuration/guides/inline-assets'],
    },
  ],
  packagesSidebar: [
    {
      type: 'category',
      label: 'API',
      items: [
        'api/about',
        {
          type: 'category',
          label: '@callstack/repack',
          items: getApiItems('repack', [
            'classes',
            'functions',
            'interfaces',
            'modules',
            'types',
            'variables',
          ]),
        },
        {
          type: 'category',
          label: '@callstack/repack/client',
          items: getApiItems('repack/client', [
            'classes',
            'functions',
            'interfaces',
            'modules',
            'types',
          ]),
        },
        {
          type: 'category',
          label: '@callstack/repack-dev-server',
          items: getApiItems('dev-server', [
            'enums',
            'functions',
            'interfaces',
            'modules',
            'types',
          ]),
        },
      ],
    },
  ],
};
