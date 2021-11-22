> npm install build-ipload-qiniu
> 
> const BuildAndUpload from 'build-ipload-qiniu'
```
new BuildAndUpload({
  isServer: config.name === 'client', // 单页面打包直接写false 或者不写
  client: config.name, // 暂时不用
  key_prefix: '_next/static/', // 前缀，前面的 / 不需要写
  uploadPath: path.join(__dirname, 'dist/static'), //上传路径，必传
  overwrite: true, // 是否覆盖上传
  qiniu: {
    ak: 'C17UqM_e1QYqNMSXDpTqvnnke-eNFtccjj9JbSHm',
    sk: '8SNvuR3MJFymdI4uRUYmhjgjhQIGt-WkQZEPBcR1',
    bucket: 'homeup',
    qiniu_name: 'db921005@163.com'
  }
})
```# build-upload-qiniu
