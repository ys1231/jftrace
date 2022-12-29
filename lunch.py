#coding:utf-8
import sys
import time
import os
import frida
from loguru import logger as log

"""
保存日志
"""
os.chdir(os.path.abspath(os.path.dirname(__file__)))
log.add("./jftrace"+time.strftime("%Y-%m-%d_%H:%M:%S", time.localtime())+".log")

def redJavaScript(filePath="./test.js"):
    with open(filePath,"r",encoding="utf-8") as f:
        data=f.read()
        #print(data)
        return data

def on_message(message, data):
    """
    # 自定义回调函数
    :param message:
    :param data:
    """
    if message['type'] == 'send':
        # print("rcve[msg]: {}".format(message['payload']))
        if '!' in message['payload']:
            log.error("rcve[msg]: {}".format(message['payload']))
        else:
            log.debug("rcve[msg]: {}".format(message['payload']))
        pass
    elif message['type'] == 'error':
        # print(message)
        # print("rcve[error]: {}".format(message['description']))
        for key,value in message.items():
            log.error("rcve[error]: {} : {}".format(key,value))
        pass
    else:
        print(message)
        pass
    # print(data)

# Press the green button in the gutter to run the script.
def main(apkName="com.example.ndkdemo",cjscode="./scripts/ndkdemo.js"):
    """
    主函数
    :param apkName:  包名
    :param cjscode:  使用的jsHOOK脚本
    """
    try:
        jscode = redJavaScript(cjscode)
        device=frida.get_usb_device()
        # device=frida.get_device_manager().add_remote_device("192.168.0.4:5555")
        # device=frida.get_device_manager().get_remote_device()
        pid=device.spawn([apkName])
        time.sleep(3)
        session=device.attach(pid)
        #session=device.attach(apkName)
        script = session.create_script(jscode)
        script.load()
        script.on('message', on_message)
        # 延迟恢复app执行 用于 hook的函数在最早 且 较快速度执行完 比如 onCreate函数
        
        script.exports.main(1)

        time.sleep(2)
        device.resume(pid)
        # 延迟调用 
        # python 调用
        # script.exports.init1()
        # script.exports.init2("python hello frida")
        # result = script.exports.init3(1,2)
        # print("result:{}".format(result))
        # time.sleep(1)
        # script.exports.main()
        # device.resume(pid)
        sys.stdin.read()
        # session.detach()
    except Exception as e:
        print(e)
        print("\n\n")
        return


if __name__ == '__main__':
    
    # vscode debugging 
    print("\n\n")
    # print(os.path.abspath(os.path.dirname(__file__)))
    os.chdir(os.path.abspath(os.path.dirname(__file__)))
    # print(os.getcwd())
    # /Users/l/Projects/AndroidHook/fridaProjects/frida-agent-example/agent/com.iyue.examplehook/com.iyue.examplehook.js
    # main("com.iyue.examplehook","./com.iyue.examplehook.js")
    # main("com.iyue.examplehook","./main.js")
    # main("com.iyue.classloaderiyue","./main.js")
    main("com.tencent.mm","./main.js")
