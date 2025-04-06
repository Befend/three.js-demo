

const pageList = [
  {
    path: '/bubble',
    name: '01.泡泡',
    component: () => import('../views/examples/bubble.vue'),
    meta: {
      title: '泡泡',
      icon: 'el-icon-s-home',
      hidden: false,
      affix: false,
      noCache: false,
      breadcrumb: true,
    }
  }
];

export default pageList;