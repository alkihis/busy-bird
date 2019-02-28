function readFile(file) {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();

        fr.onload = function() {
            resolve(this.result);
        };

        fr.onerror = function(err) {
            reject(err);
        }
    
        fr.readAsText(file);
    });
}
