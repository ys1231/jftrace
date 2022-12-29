/**
 * author: iyue
 * time  : 2022/12/28  
 * java层 api 追踪
 */

/** 
 * 字符串转 字节数组 
 * @param {*} str 
 * @returns 
 */
function stringToBytes(str) {
    var javaString = Java.use('java.lang.String');
    var bytes = [];
    bytes = javaString.$new(str).getBytes();
    return bytes;
}


/**
 * author: iyue
 * time : 2022/12/28 16:41
 * function : 初始化函数
 */
rpc.exports = {
    init1() {
        var str = "init frida"
        console.log(str)
        send(str)
    },
    init2(str1) {
        console.log(str1)
        send(str1)
    },
    init3(num1, num2) {
        send(num1 + "+" + num2 + " = " + (num1 + num2))
        return num1 + num2
    },
    main: function init(args) {
        main(args)
    }
}




/**
 * 枚举所有类
 * @param {*} classNameWhiteList 
 * @param {*} classNameBlackList 
 * @returns 返回枚举到的类名称
 * 如果有白名单 只hook 白名单
 * 如果没有白名单 会过滤黑名单
 * 如果黑白名单都没有, 会hook 所有类
 */

function loadClasss(classNameWhiteList, classNameBlackList) {
    var classs = new Set()
    send("! start loadClasss")
    Java.enumerateClassLoaders({
        onMatch: function (loader) {
            if (loader.toString().indexOf("java.lang.BootClassLoader") == -1) {
                console.log("Loading " + loader.toString())
                Java.classFactory.loader = loader

                var ClassLoader = Java.use("java.lang.ClassLoader")
                ClassLoader.loadClass.overload('java.lang.String', 'boolean').implementation = function (name, resolve) {
                    var retval = this.loadClass(name, resolve)
                    var tmpClass = retval.getName()
                    send("loadClass:(" + JSON.stringify(arguments[0]) + ") ->  " + tmpClass)

                    var istrace = false
                    classNameWhiteList.forEach(function (className) {
                        // send(' !: ' + className)  className !== null || className !== undefined || className !== ''
                        if (tmpClass.indexOf(className) != -1) {
                            istrace = true
                        }
                    })
                    if (istrace) {
                        enumMethods(tmpClass)
                    }
                    if (classNameWhiteList.size == 0 && classNameBlackList.size > 0) {
                        var isblack = true
                        classNameBlackList.forEach(function (className) {
                            if (name.indexOf(className) != -1) {
                                // 过滤 黑名单
                                // send("skip: " + name)
                                isblack = false
                            }
                        })
                        // 如果有一个命中的黑名单则 不添加
                        if (isblack) {
                            // 去除 基本数据类型  类名 没有点的 
                            if (name.indexOf(".") != -1 && name.indexOf("[L") == -1) {
                                enumMethods(tmpClass)
                            }
                        }
                    } else {
                        // 添加全部类 去除 基本数据类型  类名 没有点的 
                        if (name.indexOf(".") != -1 && name.indexOf("[L") == -1 && classNameWhiteList.size == 0) {
                            // send("addall : " + name)
                            enumMethods(tmpClass)
                        }
                    }
                    
                    return retval
                }
                ClassLoader.$dispose()
            }
        }, onComplete: function () {
            send("enumerateClassLoaders onComplete!")
        }
    })

    send("! end loadClasss")

}

/**
 * 枚举所有类
 * @param {*} classNameWhiteList 
 * @param {*} classNameBlackList 
 * @returns 返回枚举到的类名称
 * 如果有白名单 只hook 白名单
 * 如果没有白名单 会过滤黑名单
 * 如果黑白名单都没有, 会hook 所有类
 */

function enumClasss(classNameWhiteList, classNameBlackList) {
    var classs = new Set()
    send("! start enumClasss")
    Java.enumerateLoadedClasses({
        onMatch: function (name, handle) {
            // console.log(name + ': ' + handle)
            // send(name+ ' : ' + handle)
            classNameWhiteList.forEach(function (className) {
                // send(' !: ' + className)  className !== null || className !== undefined || className !== ''
                if (name.indexOf(className) != -1) {
                    send(name + ' :! ' + handle)
                    classs.add(name)
                    return
                }
            })
            if (classNameWhiteList.size == 0 && classNameBlackList.size > 0) {
                var isblack = true
                classNameBlackList.forEach(function (className) {
                    if (name.indexOf(className) != -1) {
                        // 过滤 黑名单
                        // send("skip: " + name)
                        isblack = false
                    }
                })
                // 如果有一个命中的黑名单则 不添加
                if (isblack) {
                    // 去除 基本数据类型  类名 没有点的 
                    if (name.indexOf(".") != -1 && name.indexOf("[L") == -1) {
                        // send("add : " + name)
                        classs.add(name)
                    }
                }
            } else {
                // 添加全部类 去除 基本数据类型  类名 没有点的 
                if (name.indexOf(".") != -1 && name.indexOf("[L") == -1 && classNameWhiteList.size == 0) {
                    // send("addall : " + name)
                    classs.add(name)
                }
            }
        }, onComplete: function () {
            console.log("onComplete")
            // 去除 基本数据类型  类名 没有点的 
            // classs.delete("byte")
            // classs.delete("char")
            // classs.delete("double")
            // classs.delete("float")
            // classs.delete("int")
            // classs.delete("long")
            // classs.delete("short")
            // classs.delete("void")
            // classs.delete("boolean")
            send("class number is " + classs.size)
            send("onComplete!")
        }
    })
    classs.forEach(function (name) {
        // send("! : " + name)
        enumMethods(name)
    })
    send("! end enumClasss")

}


/**
 * 根据类名 枚举所有方法 
 * @param {*} className 
 */
function enumMethods(className) {
    var classMethods = new Set()
    // 1. 根据类名称 创建类对象 
    // send("enumMethods:" + className)
    var jclass = Java.use(className)
    // 2. 通过类对象反射获取所有方法
    var methods = jclass.class.getDeclaredMethods()
    methods.forEach(function (method) {
        // send(className + ": " + method.toString())
        classMethods.add(method.getName())
    })
    // 3. 销毁对象
    jclass.$dispose()

    // TODO: 准备hook 找到的所有方法
    classMethods.forEach(function (method) {
        // send(className+" ! " + method)
        traceMethod(className, method)
    })
}

/**
 * 对单个函数进行hook
 * @param {*} className 
 * @param {*} method 
 */
function traceMethod(className, method) {
    // send(className+" ! "+method)
    var jclass = Java.use(className)
    for (var i = 0; i < jclass[method].overloads.length; i++) {
        // send("!hook "+jclass[method].overloads[i])
        jclass[method].overloads[i].implementation = function () {
            var retval = this[method].apply(this, arguments);
            // var args = "("
            // for (var j = 0; j < arguments.length; j++) {
            //     args.concat(JSON.stringify(arguments[j]) + ",")
            //     // send("arg[" + j + "]: " + arguments[j] + " => " + JSON.stringify(arguments[j]));
            // }
            // args.concat(")")
            send(className + ":" + method + JSON.stringify(arguments) + "->" + retval)
            return retval
        }
    }

}

/**
 * main function spawn
 */
function main(spawn) {
    if (Java.available) {
        Java.perform(function () {
            // js 脚本入口  
            send('start!')

            // 白名单
            var WhiteList = new Set()
            // WhiteList.add("com.iyue")
            // WhiteList.add("com.tencent.mm")

            // 黑名单
            var BlackList = new Set()
            BlackList.add("android.")
            BlackList.add("androidx.")
            if (spawn) {
                loadClasss(WhiteList, BlackList)
            } else {
                enumClasss(WhiteList, BlackList)
            }

            send("end!")

        })
    }
}


// setImmediate(main)
// 延迟加载 毫秒
// setTimeout(main,1000)