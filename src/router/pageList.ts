

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
  },
  {
    path: '/ocean',
    name: '02.海洋',
    component: () => import('../views/examples/ocean.vue'),
    meta: {
      title: '海洋',
      icon: 'el-icon-s-home',
      hidden: false,
      affix: false,
      noCache: false,
      breadcrumb: true,
    }
  },
  {
    path: '/dynamicCube',
    name: '03.动态网格',
    component: () => import('../views/examples/dynamicCube.vue'),
    meta: {
      title: '动态网格',
      icon: 'el-icon-s-home',
      hidden: false,
      affix: false,
      noCache: false,
      breadcrumb: true,
    }
  },
  {
    path: '/vr',
    name: '04.vr看房',
    component: () => import('../views/examples/vr.vue'),
    meta: {
      title: 'vr看房',
      icon: 'el-icon-s-home',
      hidden: false,
      affix: false,
      noCache: false,
      breadcrumb: true,
    }
  },
  {
    path: '/airplane',
    name: '05.飞机',
    component: () => import('../views/examples/airplane.vue'),
    meta: {
      title: '飞机',
      icon: 'el-icon-s-home',
      hidden: false,
      affix: false,
      noCache: false,
      breadcrumb: true,
    }
  }
];

export default pageList;