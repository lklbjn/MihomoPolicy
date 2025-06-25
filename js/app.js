/**
 * Mihomo配置修改器
 * 用于解析和修改mihomo(原Clash Meta)的yml配置文件
 * 主要功能：添加listeners配置，实现多端口不同策略组
 */

document.addEventListener('DOMContentLoaded', () => {
    // 获取DOM元素
    const configFileInput = document.getElementById('configFile');
    const configUrlInput = document.getElementById('configUrl');
    const loadUrlBtn = document.getElementById('loadUrlConfig');
    const fileNameDisplay = document.getElementById('fileName');
    const configContent = document.getElementById('configContent');
    const listenersList = document.getElementById('listenersList');
    const addListenerBtn = document.getElementById('addListener');
    const saveListenersBtn = document.getElementById('saveListeners');
    const loadListenersBtn = document.getElementById('loadListeners');
    const exportListenersBtn = document.getElementById('exportListeners');
    const importListenersBtn = document.getElementById('importListeners');
    const importFileInput = document.getElementById('importFile');
    const generateConfigBtn = document.getElementById('generateConfig');
    const downloadConfigBtn = document.getElementById('downloadConfig');

    // 存储原始配置和修改后的配置
    let originalConfig = null;
    let modifiedConfig = null;
    let fileName = '';
    
    // localStorage键名
    const STORAGE_KEY = 'mihomo_listeners_config';

    // 监听文件上传事件
    configFileInput.addEventListener('change', handleFileUpload);
    loadUrlBtn.addEventListener('click', handleUrlLoad);
    
    // 添加监听器按钮事件
    addListenerBtn.addEventListener('click', addNewListener);
    saveListenersBtn.addEventListener('click', saveListenersToStorage);
    loadListenersBtn.addEventListener('click', loadListenersFromStorage);
    exportListenersBtn.addEventListener('click', exportListenersConfig);
    importListenersBtn.addEventListener('click', function() {
        importFileInput.click();
    });
    importFileInput.addEventListener('change', importListenersConfig);
    
    // 生成配置按钮事件
    generateConfigBtn.addEventListener('click', generateModifiedConfig);
    
    // 下载配置按钮事件
    downloadConfigBtn.addEventListener('click', downloadModifiedConfig);

    /**
     * 处理文件上传
     */
    function handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 检查文件类型
        if (!file.name.endsWith('.yml') && !file.name.endsWith('.yaml')) {
            alert('请上传.yml或.yaml格式的配置文件');
            return;
        }

        fileName = file.name;
        fileNameDisplay.textContent = fileName;

        const reader = new FileReader();
        reader.onload = function(e) {
            processConfigContent(e.target.result);
        };
        reader.readAsText(file);
    }
    
    /**
     * 从URL加载配置
     */
    function handleUrlLoad() {
        const url = configUrlInput.value.trim();
        if (!url) {
            alert('请输入有效的URL');
            return;
        }
        
        // 显示加载状态
        fileNameDisplay.textContent = '正在从URL加载...';
        
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络响应不正常');
                }
                fileName = url.split('/').pop() || 'config.yml';
                return response.text();
            })
            .then(content => {
                processConfigContent(content);
            })
            .catch(error => {
                alert('从URL加载配置失败: ' + error.message);
                console.error('从URL加载配置失败:', error);
                fileNameDisplay.textContent = '加载失败';
            });
    }
    
    /**
     * 处理配置内容
     */
    function processConfigContent(content) {
        try {
            // 解析YAML文件
            originalConfig = jsyaml.load(content);
            
            // 显示配置内容区域
            configContent.style.display = 'block';
            
            // 清空现有监听器列表
            listenersList.innerHTML = '';
            
            // 添加一个默认的监听器
            addNewListener();
            
            // 禁用下载按钮，直到生成新配置
            downloadConfigBtn.disabled = true;
            
            // 显示文件名
            fileNameDisplay.textContent = fileName;
            
        } catch (error) {
            alert('解析配置文件失败: ' + error.message);
            console.error('解析配置文件失败:', error);
        }
    }

    /**
     * 添加新的监听器配置项
     * @param {Event} event - 事件对象，可选
     * @param {Object} config - 监听器配置，可选
     */
    function addNewListener(event, config) {
        const template = document.getElementById('listenerTemplate');
        const listenerNode = document.importNode(template.content, true);
        
        // 设置监听器编号
        const listenerNumber = listenersList.children.length + 1;
        listenerNode.querySelector('.listener-number').textContent = listenerNumber;
        
        // 如果有配置，填充值
        if (config) {
            if (config.name) listenerNode.querySelector('.name').value = config.name;
            if (config.type) listenerNode.querySelector('.type').value = config.type;
            if (config.port) listenerNode.querySelector('.port').value = config.port;
            if (config.listen) listenerNode.querySelector('.listen').value = config.listen;
            if (config.proxy) listenerNode.querySelector('.proxy').value = config.proxy;
            if (config['proxy-regex']) listenerNode.querySelector('.proxy-regex').value = config['proxy-regex'];
        }
        
        // 添加删除按钮事件
        const removeBtn = listenerNode.querySelector('.btn-remove');
        removeBtn.addEventListener('click', function() {
            this.closest('.listener-item').remove();
            // 重新编号所有监听器
            updateListenerNumbers();
        });
        
        // 添加到列表
        listenersList.appendChild(listenerNode);
    }

    /**
     * 更新监听器编号
     */
    function updateListenerNumbers() {
        const listeners = listenersList.querySelectorAll('.listener-item');
        listeners.forEach((listener, index) => {
            listener.querySelector('.listener-number').textContent = index + 1;
        });
    }

    /**
     * 根据正则表达式筛选代理
     */
    function filterProxiesByRegex(proxies, regexStr) {
        try {
            const regex = new RegExp(regexStr, 'i');
            return proxies.filter(proxy => regex.test(proxy.name)).map(proxy => proxy.name);
        } catch (error) {
            console.error('正则表达式错误:', error);
            return [];
        }
    }

    /**
     * 生成修改后的配置
     */
    function generateModifiedConfig() {
        if (!originalConfig) {
            alert('请先上传配置文件');
            return;
        }

        // 克隆原始配置
        modifiedConfig = JSON.parse(JSON.stringify(originalConfig));
        
        // 获取所有监听器配置
        const listenerItems = listenersList.querySelectorAll('.listener-item');
        const listeners = [];
        const proxyGroups = modifiedConfig['proxy-groups'] || [];
        
        // 检查是否有代理列表
        if (!modifiedConfig.proxies || !Array.isArray(modifiedConfig.proxies)) {
            alert('配置文件中没有找到有效的代理列表');
            return;
        }

        // 处理每个监听器
        listenerItems.forEach(item => {
            const name = item.querySelector('.name').value.trim();
            const type = item.querySelector('.type').value;
            const port = parseInt(item.querySelector('.port').value);
            const listen = item.querySelector('.listen').value.trim();
            const proxyName = item.querySelector('.proxy').value.trim();
            const proxyRegex = item.querySelector('.proxy-regex').value.trim();
            
            // 验证必填字段
            if (!name || !type || isNaN(port) || !listen || !proxyName || !proxyRegex) {
                alert('请填写监听器配置字段');
                return;
            }
            
            // 根据正则表达式筛选代理
            const matchedProxies = filterProxiesByRegex(modifiedConfig.proxies, proxyRegex);
            
            if (matchedProxies.length === 0) {
                alert(`警告: 正则表达式 "${proxyRegex}" 没有匹配到任何代理`);
            }
            
            // 创建新的代理组
            const newProxyGroup = {
                name: proxyName,
                type: 'select',
                proxies: matchedProxies
            };
            
            // 检查是否已存在同名代理组
            const existingGroupIndex = proxyGroups.findIndex(group => group.name === proxyName);
            if (existingGroupIndex !== -1) {
                proxyGroups[existingGroupIndex] = newProxyGroup;
            } else {
                proxyGroups.push(newProxyGroup);
            }
            
            // 创建监听器配置
            listeners.push({
                name,
                type,
                port,
                listen,
                proxy: proxyName
            });
        });
        
        // 更新代理组
        modifiedConfig['proxy-groups'] = proxyGroups;
        
        // 更新监听器配置
        modifiedConfig.listeners = listeners;
        
        if (listeners.length === 0) {
            alert('监听器配置为空');
            return;
        }

        // 启用下载按钮
        downloadConfigBtn.disabled = false;
        
        alert('配置生成成功，可以点击下载按钮保存');
    }

    /**
     * 下载修改后的配置
     */
    function downloadModifiedConfig() {
        if (!modifiedConfig) {
            alert('请先生成配置');
            return;
        }
        
        try {
            // 转换为YAML格式
            const yamlContent = jsyaml.dump(modifiedConfig, {
                lineWidth: -1,  // 不限制行宽
                noRefs: true     // 不使用引用
            });
            
            // 创建下载链接
            const blob = new Blob([yamlContent], { type: 'text/yaml' });
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            
            // 设置下载文件名
            const newFileName = fileName.replace(/\.ya?ml$/, '') + '_modified.yml';
            
            downloadLink.href = url;
            downloadLink.download = newFileName;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(downloadLink);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            alert('生成下载文件失败: ' + error.message);
            console.error('生成下载文件失败:', error);
        }
    }
    
    /**
     * 保存Listeners配置到localStorage
     */
    function saveListenersToStorage() {
        const listeners = getListenersFromUI();
        if (listeners.length === 0) {
            alert('没有可保存的监听器配置');
            return;
        }
        
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(listeners));
            alert('监听器配置已保存');
        } catch (error) {
            alert('保存监听器配置失败: ' + error.message);
            console.error('保存监听器配置失败:', error);
        }
    }
    
    /**
     * 从localStorage加载Listeners配置
     */
    function loadListenersFromStorage() {
        try {
            const savedConfig = localStorage.getItem(STORAGE_KEY);
            if (!savedConfig) {
                alert('没有找到保存的监听器配置');
                return;
            }
            
            const listeners = JSON.parse(savedConfig);
            applyListenersToUI(listeners);
            alert('监听器配置已加载');
        } catch (error) {
            alert('加载监听器配置失败: ' + error.message);
            console.error('加载监听器配置失败:', error);
        }
    }
    
    /**
     * 导出Listeners配置为JSON文件
     */
    function exportListenersConfig() {
        const listeners = getListenersFromUI();
        if (listeners.length === 0) {
            alert('没有可导出的监听器配置');
            return;
        }
        
        try {
            const jsonContent = JSON.stringify(listeners, null, 2);
            const blob = new Blob([jsonContent], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            
            downloadLink.href = url;
            downloadLink.download = 'mihomo_listeners_config.json';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            
            // 清理
            setTimeout(() => {
                document.body.removeChild(downloadLink);
                URL.revokeObjectURL(url);
            }, 100);
        } catch (error) {
            alert('导出监听器配置失败: ' + error.message);
            console.error('导出监听器配置失败:', error);
        }
    }
    
    /**
     * 导入Listeners配置
     */
    function importListenersConfig(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const content = e.target.result;
                const listeners = JSON.parse(content);
                
                applyListenersToUI(listeners);
                alert('监听器配置已导入');
                
                // 重置文件输入
                event.target.value = '';
            } catch (error) {
                alert('解析导入文件失败: ' + error.message);
                console.error('解析导入文件失败:', error);
            }
        };
        reader.readAsText(file);
    }
    
    /**
     * 从UI获取所有监听器配置
     */
    function getListenersFromUI() {
        const listeners = [];
        const listenerElements = listenersList.querySelectorAll('.listener-item');
        
        listenerElements.forEach(element => {
            const nameInput = element.querySelector('.name');
            const typeInput = element.querySelector('.type');
            const portInput = element.querySelector('.port');
            const listenInput = element.querySelector('.listen');
            const proxyInput = element.querySelector('.proxy');
            const proxyRegexInput = element.querySelector('.proxy-regex');
            
            if (nameInput && typeInput && portInput) {
                const listener = {
                    name: nameInput.value,
                    type: typeInput.value,
                    port: parseInt(portInput.value)
                };
                
                if (listenInput && listenInput.value) {
                    listener.listen = listenInput.value;
                }
                
                if (proxyInput && proxyInput.value) {
                    listener.proxy = proxyInput.value;
                }
                
                if (proxyRegexInput && proxyRegexInput.value) {
                    listener['proxy-regex'] = proxyRegexInput.value;
                }
                
                listeners.push(listener);
            }
        });
        
        return listeners;
    }
    
    /**
     * 将监听器配置应用到UI
     */
    function applyListenersToUI(listeners) {
        // 清空现有监听器
        listenersList.innerHTML = '';
        
        // 添加导入的监听器
        listeners.forEach(listener => {
            const listenerNode = document.importNode(document.getElementById('listenerTemplate').content, true);
            
            // 设置监听器编号
            const listenerNumber = listenersList.children.length + 1;
            listenerNode.querySelector('.listener-number').textContent = listenerNumber;
            
            // 填充值
            if (listener.name) listenerNode.querySelector('.name').value = listener.name;
            if (listener.type) listenerNode.querySelector('.type').value = listener.type;
            if (listener.port) listenerNode.querySelector('.port').value = listener.port;
            if (listener.listen) listenerNode.querySelector('.listen').value = listener.listen;
            if (listener.proxy) listenerNode.querySelector('.proxy').value = listener.proxy;
            if (listener['proxy-regex']) listenerNode.querySelector('.proxy-regex').value = listener['proxy-regex'];
            
            // 添加删除按钮事件
            const removeBtn = listenerNode.querySelector('.btn-remove');
            removeBtn.addEventListener('click', function() {
                this.closest('.listener-item').remove();
                // 重新编号所有监听器
                updateListenerNumbers();
            });
            
            // 添加到列表
            listenersList.appendChild(listenerNode);
        });
    }
});