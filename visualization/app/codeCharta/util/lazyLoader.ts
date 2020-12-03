
export class LazyLoader {

    static openFolderDialog(fileName: string){
        if (localStorage.getItem(fileName) === null && confirm("Directory not chosen. Choose now?")){
            const input = document.createElement("input")
            const qualifiedNames = ['type', 'webkitdirectory', 'directory', 'mozdirectory', 'msdirectory', 'odirectory']
            const values = ['file', 'true', 'true', 'true', 'true', 'true']
            for (const [index, value] of values.entries()){
                input.setAttribute(qualifiedNames[index], value)
            }
            input.onchange = function(){
                // onChange is not triggered if selected folder is empty
                // @ts-ignore
                const directoryName = input.files[0]?.webkitRelativePath?.split("/")[0]
                localStorage.setItem(fileName, directoryName)
            }
            input.click()
        }
        //window.open(localStorage.getItem(fileName), "_blank")
    }
}
