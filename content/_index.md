---
# Leave the homepage title empty to use the site title
title: ""
date: 2022-10-24
type: landing

design:
  # Default section spacing
  spacing: "6rem"

sections:
  - block: resume-biography-3
    content:
      # Choose a user profile to display (a folder name within `content/authors/`)
      username: admin
      text: ""
      # Show a call-to-action button under your biography? (optional)
      # button:
      #   text: Download CV
      #   url: uploads/resume.pdf
    design:
      css_class: dark
      # Avatar customization
      avatar:
        size: medium  # Options: small (150px), medium (200px, default), large (320px), xl (400px), xxl (500px)
        shape: circle # Options: circle (default), square, rounded
      background:
        color: black
        image:
          # Add your image background to `assets/media/`.
          filename: stacked-peaks.svg
          filters:
            brightness: 1.0
          size: cover
          position: center
          parallax: false
  - block: markdown
    content:
      title: '🎯 核心亮点'
      subtitle: ''
      text: |-
        ### 🚀 技术专长
        专注于**大数据处理**、**机器学习**和**全栈开发**，具备从前端到后端的完整技术栈能力

        ### 💼 项目经验
        **7个完整项目**：4个独立开发 + 2个团队核心开发 + 1个学术研究，涵盖金融、医疗、AI等领域

        ### 🎓 学术背景
        北京理工大学**徐特立英才班** + **经济学辅修**，跨学科复合背景

        ### 🏆 获奖成就
        **MathorCup数学建模竞赛**地区一等奖 + **校级奖学金** + **英语六级**
    design:
      columns: '1'
  - block: collection
    id: projects
    content:
      title: 🛠️ 精选项目展示
      subtitle: 展示最具代表性的技术项目，完整项目列表请访问"项目作品"页面
      filters:
        folders:
          - project
        featured_only: true
    design:
      view: article-grid
      columns: 2
  - block: markdown
    id: contact
    content:
      title: '📧 联系方式'
      subtitle: ''
      text: |-
        ### 📬 联系我
        - **邮箱**：1285622496@qq.com
        - **GitHub**：[github.com/miaowumiaomiaowu](https://github.com/miaowumiaomiaowu)

        ### 🤝 合作交流
        欢迎技术交流、项目合作、学术讨论！

        特别欢迎：
        - 技术方案讨论和代码交流
        - 开源项目合作
        - 学术研究合作
        - 实习和工作机会
    design:
      columns: '1'
---
