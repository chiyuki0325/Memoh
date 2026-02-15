import { defineConfig } from 'vitepress'

// https://vitepress.vuejs.org/config/app-configs
export default defineConfig({
  title: 'Memoh Documentation',
  description: 'Multi-Member, Structured Long-Memory, Containerized AI Agent System.',

  head: [
    ['link', { rel: 'icon', href: '/logo.png' }]
  ],

  base: '/',

  locales: {
    root: {
      label: 'English',
      lang: 'en'
    },
    zh: {
      label: '简体中文',
      lang: 'zh',
    }
  },

  themeConfig: {
    siteTitle: 'Memoh',
    sidebar: {
      '/': [
        {
          text: 'Overview',
          link: '/index.md'
        },
        {
          text: 'About Memoh',
          link: '/getting-started.md'
        },
        {
          text: 'Installation',
          items: [
            {
              text: 'Docker',
              link: '/installation/docker.md'
            },
            {
              text: 'config.toml',
              link: '/installation/config-toml.md'
            }
          ]
        },
        {
          text: 'Getting Started',
          items: [
            {
              text: 'Provider and Model',
              link: '/getting-started/provider-and-model.md'
            }
          ]
        },
        {
          text: 'CLI',
          items: [
            {
              text: 'Overview',
              link: '/cli/index.md'
            },
            {
              text: 'authentication',
              link: '/cli/auth.md'
            },
            {
              text: 'config',
              link: '/cli/config.md'
            },
            {
              text: 'provider',
              link: '/cli/provider.md'
            },
            {
              text: 'model',
              link: '/cli/model.md'
            },
            {
              text: 'bot',
              link: '/cli/bot.md'
            },
            {
              text: 'channel',
              link: '/cli/channel.md'
            },
            {
              text: 'schedule',
              link: '/cli/schedule.md'
            },
            {
              text: 'chat',
              link: '/cli/chat.md'
            }
          ]
        }
      ],
      '/zh/': [
        {
          text: '文档总览',
          link: '/zh/index.md'
        }
      ]
    },

    logo: {
      src: '/logo.png',
      alt: 'Memoh'
    },
    
    socialLinks: [
      { icon: 'github', link: 'https://github.com/memohai/Memoh' }
    ],
    
    footer: {
      message: 'Published under AGPLv3',
      copyright: 'Copyright © 2024 Memoh'
    },
    
    search: {
      provider: 'local'
    },
    
    editLink: {
      pattern: 'https://github.com/memohai/Memoh/edit/main/docs/docs/:path',
      text: 'Edit on GitHub'
    },
    
    lastUpdated: {
      text: 'Last Updated',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    }
  },

  ignoreDeadLinks: true,
})
