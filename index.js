const path = require('path');
const fs = require('fs');
const execFileSync = require('child_process').execFileSync;
const os = require('os');
const chalk = require('chalk');
const got = require('got');
const { promisify } = require('util');
const stream = require('stream');
const extract = require('extract-zip');
const pipeline = promisify(stream.pipeline);
const readline = require('readline');

class BuildAndUpload {
  constructor(options) {
    this.options = Object.assign(
      {
        startTime: new Date().getTime(),
        isServer: false,
        key_prefix: '_next/',
        qiniu: {
          ak: '',
          sk: '',
          bucket: '',
          qiniu_name: '',
        },
      },
      options
    );
    console.log(this.options);
    if (
      !this.options.qiniu.ak ||
      !this.options.qiniu.sk ||
      !this.options.qiniu.qiniu_name
    ) {
      throw new Error('没有正确设置七牛账号');
    }
    if (!this.options.qiniu.bucket) {
      throw new Error('没有设置七牛bucket');
    }
    if (!this.options.uploadPath) {
      throw new Error('uploadPath 没有设置');
    }
  }
  checkQshell() {
    if (!fs.existsSync(path.resolve(__dirname, 'utils'))) {
      console.log(chalk.yellow('未检测到utils目录，开始创建...'));
      //创建utils 目录，用于存放上传工具
      fs.mkdirSync(path.resolve(__dirname, 'utils'));
    }
    const utilsPath = path.resolve(__dirname, 'utils/qshell');
    const _this = this;
    fs.access(utilsPath, (err) => {
      const platType = os.type();

      if (err) {
        console.log(
          chalk.yellow('未检测到' + platType + '-qshell上传工具，开始下载...')
        );
        const fileName = {
          Linux: 'qshell-v2.6.2-linux-amd64.zip',
          Darwin: 'qshell-v2.6.2-darwin-amd64.zip',
          Windows_NT: 'qshell-v2.6.2-windows-amd64.zip',
        };
        (async () => {
          await pipeline(
            got.stream('https://sr.kaikeba.com/qshell/' + fileName[platType]),
            fs
              .createWriteStream(
                path.resolve(__dirname, './utils/' + fileName[platType])
              )
              .on('close', (err) => {
                if (err) {
                  throw new Error('上传工具下载失败');
                }
                console.log(chalk.green('开始解压...'));
                const fileSrc = path.resolve(
                  __dirname,
                  './utils/' + fileName[platType]
                );
                fs.stat(fileSrc, function (err, stats) {
                  if (stats.isFile()) {
                    // const qshellStream = fs.readFileSync(fileSrc);
                    const dst = path.resolve(__dirname, './utils');
                    (async () => {
                      await extract(fileSrc, { dir: dst });
                      console.log(chalk.blue('解压完成'));
                      console.log(chalk.green('开始上传文件...'));
                      _this.uploadDist();
                    })();
                  }
                });
              })
          );
        })();
      } else {
        console.log(chalk.green('检测到上传工具，开始上传文件...'));
        this.uploadDist();
      }
    });
  }

  uploadDist() {
    const filePath = path.resolve(__dirname, 'upload.conf');
    const { key_prefix, uploadPath, buildId, qiniu } = this.options;
    if (!fs.existsSync(filePath)) {
      throw new Error('error');
    }
    const data = fs.readFileSync(filePath).toString();
    let jsonData = JSON.parse(data);
    jsonData['src_dir'] = uploadPath;
    jsonData['key_prefix'] = key_prefix;
    jsonData['log_file'] = uploadPath + '/upload.log';
    if (buildId) {
      jsonData['key_prefix'] = buildId + '/' + key_prefix;
    }
    fs.writeFileSync(
      path.resolve(process.cwd(), 'dist/upload.conf'),
      JSON.stringify(jsonData, null, 2)
    );
    if (!__dirname) {
      const __dirname = path.resolve();
    }
    const setAccount = execFileSync(
      path.resolve(__dirname, 'utils/qshell'),
      ['account', '--', qiniu.ak, qiniu.sk, qiniu.bucket],
      {
        encoding: 'utf-8',
        timeout: 300 * 1000,
        shell: true,
      }
    );
    const uploadShell = execFileSync(path.resolve(__dirname, 'utils/qshell'), [
      'qupload',
      `${process.cwd()}/dist/upload.conf`,
    ]);
    const r1 = readline.createInterface({
      input: fs.createReadStream(uploadPath + '/upload.log'),
    });
    let i = 1;
    r1.on('line', function (line) {
      console.log(line);
      i += 1;
    });
  }

  // robotMsg(constTime) {
  //   const { npm_package_name } = process.env;
  //   const url =
  //     this.options.dingUrl ||
  //     'https://oapi.dingtalk.com/robot/send?access_token=0eb846e2c314f16b2d31d5fd4e693c81cb53f15c4f92ab185488c59ded4e4e33';
  //   // 方式二this.options
  //   let params = {
  //     msgtype: 'markdown',
  //     markdown: {
  //       title: '打包通知',
  //       text:
  //         '## 项目名称：' +
  //         npm_package_name +
  //         ' \n * 发版环境：dev \n * 打包耗时：' +
  //         constTime +
  //         'ms \n',
  //     },
  //   };
  //   request(
  //     {
  //       url: url,
  //       method: 'POST',
  //       json: true,
  //       headers: {
  //         'content-type': 'application/json',
  //       },
  //       body: params,
  //     },
  //     function (error, response, body) {
  //       console.error(error);
  //     }
  //   );
  // }

  apply(compiler) {
    compiler.hooks.done.tap('BuildAndUpload', (compilation) => {
      console.log(this.options, 'options');
      console.log(this.options.isServer, 'options');
      if (!this.options.isServer) {
        console.log(chalk.green('编译完成'));
        const endTime = compilation.endTime;
        const constTime = endTime - this.options.startTime;
        console.log(chalk.green(`共花费${constTime}`));
        // this.robotMsg(constTime);
        this.checkQshell();
      }
    });
    // compiler.hooks.afterEmit.tapAsync('buildtime', (_, cb) => {
    //   console.log('输出资源到目录完成');
    //   cb();
    // });
  }
}

module.exports = BuildAndUpload;
