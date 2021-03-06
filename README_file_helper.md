# cordova-file-helper

> Wrap most of the filesystem operations of Cordova File Plugin into a modern and flexible native Promise API.

API provided by `cordova-plugin-file` is quite horrible with terrible development experience: callbacks everywhere, need to fetch directories before creating a file, or the need of four operations to truncate and write a to single file.
This full Promise-designed API tries to reduce the pain of interacting with the OS in Cordova app.

## Getting started

`cordova-file-helper` needs two other cordova plugins. Install them with Cordova/Phonegap/Ionic CLI according to the needs of you project:
```bash
[phonegap] plugin add cordova-plugin-file
[phonegap] plugin add cordova-plugin-device
```

Warning: This wrapper use native Promise and a big usage of the `async`/`await` keywords to improve performance, so your project must target devices that have access to asynchronous functions (see [this](https://caniuse.com/#search=async)).
If you can't target those devices, you can use [cordova-file-helper-legacy](https://www.npmjs.com/package/cordova-file-helper-legacy) plugin, that target [those devices](https://caniuse.com/#search=promise).

### With npm

```bash
npm install cordova-file-helper
```

#### Classic CommonJS
```js
const FileHelper = require("cordova-file-helper").FileHelper;
```

#### ES6 Import
```js
import { FileHelper } from "cordova-file-helper";
```

### With HTML script

If you don't use Node.js and you can't import libs with `require()` or `import`, include [`FileHelper.js`](https://gitlab.com/Alkihis/cordova-file-helper/blob/master/dist/FileHelper.js).

```html
<script src="FileHelper.js"></script>
```
Helper will be available as `FileHelper` object.

## Basics

The File Helper consists in a object that is "related" to a directory, like a terminal.

By default, the object is initialized to the root of application data storage, and you can browse through the storage using cd(), ls(), mv(), cp(), rm(), read and write to files with read() and write() and create directories with mkdir().

## Usage

### WARNING

This documentation often refer to a `path` variable. `path` used with `FileHelper` are **always** relative to current working directory. Current working directory can be obtainable with `pwd()`.

**Mixed functions**

Numerous functions that accept a `path` parameter accept `path` as a `string` or a `Entry`.

Function that accepts `string | Entry` as `path` are:
- `write()`
- `read()` and his derivates `readJSON()`,  `toInternalURL()`, `readDataURL()`
- `mv()` and `cp()`, but only for the `dest` parameter
- `ls()`
- `tree()`

### Instanciation
File Helper use `cordova.file.externalDataDirectory || cordova.file.dataDirectory` as default values for current working directory.

Cordova base-setted directories are available at [this page](https://cordova.apache.org/docs/en/latest/reference/cordova-plugin-file/#where-to-store-files).

```js
// specify a new path in the constructor if you want to skip default values
const helper = new FileHelper(cordova.file.applicationDirectory);
```

Because FileHelper need that Cordova is ready, you ***must*** wait that your FileHelper is ready before you can use it.
```js
await helper.waitInit();
```

### File browsing

#### exists
Test if a file or directory exists
```js
helper.exists(path); // => Promise<boolean>
```

#### isFile
Test if a path exists and is a file
```js
helper.isFile(path); // => Promise<boolean>
```

#### isDir
Test if a path exists and is a directory
```js
helper.isDir(path); // => Promise<boolean>
```

#### get
Get a [FileEntry](https://cordova.apache.org/docs/fr/3.1.0/cordova/file/fileentry/fileentry.html) or a [DirectoryEntry](https://cordova.apache.org/docs/fr/3.1.0/cordova/file/directoryentry/directoryentry.html). 
You should not use this method unless you want to manipulate an `Entry`.
`get()` will fail if file or directory does not exists.
```js
helper.get(path); // => Promise<Entry>
```

#### absoluteGet
See `get()`.
You should not use this method unless you want to manipulate an `Entry`.
This method ***DON'T*** use a relative path and is not relative to current working directory.
`absoluteGet()` will fail if file or directory does not exists.

You should *not* use this method !
```js
helper.absoluteGet(path); // => Promise<Entry>
```

#### pwd
Get current working directory of the instance.
This method do *not* use Promises !
```js
helper.pwd(); // => string
```

#### cd
Change working directory.
You can change path relative to current working directory or specify an absolute path (another cordova.file.* for exemple).
Promise will be rejected if path does not exists.
```js
/// Change wd to cordova.file.dataDirectory
helper.cd(cordova.file.dataDirectory, /* relative = */ false); // => Promise<void>

/// Change wd to parent of actual working directory
helper.cd("..", /* relative = */ true); // => Promise<void>
```

#### ls
List existing files into a directory.
If `path` parameter is not specified, list files and directories that are in current working directory.

`option_string` parameter is a string where you can specify how the function is supposed to work.
- `e` return `EntryObject` instead of filenames (see `EntryObject` information).
- `f` return only files.
- `d` return only directories.
- `l` return `FileStats[]` objects instead of filenames (`string[]`).
- `p` remove subdirectory auto-prefixing, if `path` is not current working directory. `p` will not work in recursive mode (`r`), except if `e` is enabled.

`max_depth` parameter specify the maximum number of subdirectories where the function can search in.
If `max_depth` is negative, recursive mode is unlimited. 
This flag can make function very slow due to the high latency Cordova File System access.

---
***`EntryObject` information***

An `EntryObject` is a classic JS Object that index key=directory_path to value=`Entry[]`.

If your FS is like:
- json
- assets
  - images
    - img.jpg
    - img2.jpg
  - audio
    - sound.mp3

The `EntryObject` will be organized like:
```js
let o = await helper.ls(undefined /* will list current working directory */, "e", -1);
o = {
    "": /* current working directory */ [ DirectoryEntry<"json">, DirectoryEntry<"assets"> ],
    "json": [],
    "assets": [ DirectoryEntry<"images">, DirectoryEntry<"audio"> ],
    "assets/images": [ FileEntry<"img.jpg">, FileEntry<"img2.jpg"> ],
    "assets/audio": [ FileEntry<"sound.mp3"> ]
};
```

If you don't activate the `r` option, your `EntryObject` will always contains only one key, the empty string (current working directory).

---


Options are combinable into the same string.
```js
helper.ls(); // Promise<string[]>

helper.ls(path); // Promise<string[]>
// Warning: If you list a directory that is not cwd, all paths will be prefixed.
// exemple: await helper.ls("assets"); => [ "assets/images", "assets/audio" ]
// To remove prefixing, use "p" parameter

helper.ls(path, "ef"); // Promise<EntryObject>

helper.ls(path, "l"); // Promise<FileStats[]>
```

#### tree
Like `ls(path, "pre")`, but unflattened.
Returns a `EntryTree` object.

If `mime_type` parameter is `true`, file's MIME types will be returns as object values instead of `null`.

In the same file system of the `EntryObject` exemple, it gives you:
```js
helper.tree(path, add_mime_types /* = false */); // => Promise<EntryTree>

o = await helper.tree();
o = {
    "json": {},
    "assets": {
        "images": {
            "img.jpg": null,
            "img2.jpg": null
        },
        "audio": {
            "sound.mp3": null
        }
    }
};
```

#### stats
Get a `FileStats` object about a file.
```js
helper.stats(path); // => Promise<FileStats>
```

#### glob
Find files with a [glob pattern](https://en.wikipedia.org/wiki/Glob_(programming)).

Specify a glob pattern in the `pattern` parameter.
Specify custom regex flags `regex_flags`. Accepted flags are all flags supported by `RegExp` JS object.

```js
helper.glob(pattern, recursive = true, regex_flags = ""); // Promise<string[]>

helper.glob("**/*.json", true); // Find all json files below working directory
```

--- 

### File and directory managment

#### mv
Move a file or directory to another emplacement.
Can also used to rename files/directories.

```js
helper.mv(path, dest = __current_directory__, new_name = __current_name__);

// Rename "coucou.txt" file to "hello.txt" and keep it in the same directory
helper.mv("test/folder/coucou.txt", undefined, "hello.txt");

// Move "test" to "stats/cookies" folder and name it "test2"
helper.mv("test/", "stats/cookies/", "test2");
```

#### cp
Copy a file or directory to another emplacement.

```js
helper.cp(path, dest = __current_directory__, new_name = __current_name__);

// Copy "coucou.txt" file to "hello.txt" in the same directory
helper.cp("test/folder/coucou.txt", undefined, "hello.txt");

// Copy "test" to "stats/cookies" folder and name the copy "test2"
helper.cp("test/", "stats/cookies/", "test2");
```

#### mkdir
Create directory. Automatically create needed parent directories if they does not exists.
```js
// Automatically create cookie, test, second and third
// directories if they doesn't exists
helper.mkdir("cookie/test/second/third");
```

#### read
Read a existing file.
Read modes are:
- `FileHelperReadMode.text` (default) : Read as text
- `FileHelperReadMode.url` : Read as base64 URL
- `FileHelperReadMode.array` : Read as `ArrayBuffer`
- `FileHelperReadMode.internalURL` : Get internal URL of the file
- `FileHelperReadMode.json` : Read as text and parse to JSON automatically
- `FileHelperReadMode.binarystr` : Read as binary string
- `FileHelperReadMode.fileobj` : Return a `File` object that represent the file

```js
helper.read(path, method); // => Promise<string | any | ArrayBuffer>

helper.read("test.txt"); // => Promise<string>

// Read a JSON file and parse it automatically
helper.read("forms.json", FileHelperReadMode.json) // => Promise<any>
```

*Sortcuts exists for modes*:
```js
helper.readJSON("forms.json"); // => Promise<any>

helper.readDataURL("img.jpeg"); // => Promise<string>

helper.toInternalURL("test.txt"); // => Promise<string>
```

#### readAll
Read all files of a directory using a specific mode.

```js
helper.readAll(directory_path_or_entry, read_mode = FileHelperReadMode.text); // => Promise<string[] | File[] | ArrayBuffer[] | any[]>

const forms = await helper.readAll('forms', FileHelperReadMode.json);
```

#### write
Write to a file (and create it if it does not exists).

```js
// Empty or create "test.txt", and write "hello, i'm a text string !" to it
helper.write("test.txt", "hello, i'm a text string !");

let o = { str: "test" };
// Empty or create "forms.json", and write a JSON.stringified version of o
helper.write("forms.json", o);

// Append a string to "test.txt"
helper.write("test.txt", "\nAnd i'm a second one !", true);
```

#### touch
Create a file without writing in it.
```js
// Create "text.txt"
helper.touch("test.txt"); // => Promise<FileEntry>
```

#### rm
Remove a file or a directory.
Parameter `r` means for `recursive`.
Do NOT use rm with the root directory !

If `r` is `false` and the folder contains not-empty folders, remove will fail.

```js
helper.rm(path, r);

// Delete test directory and all its content
helper.rm("test/", true);
```

#### empty 
Clean a directory of all its content.
Parameter `r` means for `recursive`.
If `r` is `false` and the folder contains not-empty folders, empty will fail.

```js
helper.empty(path, r);

// Clean test directory and remove all its content
helper.empty("test/", true);
```

---

### Helpers

#### entries
Get entries (files or directories) from numerous paths.
If one path does not exists, the function will fail.

```js
helper.entries(...paths); // Promise<Entry[]>

helper.entries("test.json", "another_test.txt", "my_dir"); // Promise<[FileEntry, FileEntry, DirectoryEntry]>
```

#### entriesOf
Get entries of a directory entry.

```js
helper.entriesOf(dir_entry); // Promise<Entry[]>
```

#### newFromCd
Create a new `FileHelper` instance using current instance as base path.
Ensure that the directory exists before creating the instance, 
then wait that the new instance is ready before returning it.

```js
helper.newFromCd(relative_path); // => Promise<FileHelper>

const newHelper = await helper.newFromCd('forms');

helper.pwd();// example: cdvfile://localhost/temporary/
newHelper.pwd(); // example: cdvfile://localhost/temporary/forms/
```

#### toBlob
Convert almost any JavaScript variable into blob.
Automatically encode JavaScript objects with JSON.stringify.
Cannot encode JS functions.

```js
helper.toBlob(object);

helper.toBlob({ a: "str" }); // => Blob<"{ \"a\": \"str\" }">
```

#### readFileAs
If you have a File object, use this to read the object in a specific mode
```js
helper.readFileAs(file, mode); // => Promise<string | ArrayBuffer | any>

helper.readFileAs(file, FileHelperReadMode.text); // => Promise<string>
```

#### getFile
Extract a File object from a FileEntry or from a path.
```js
helper.getFile(fileEntry); // Promise<File>

helper.getFile(path); // Promise<File>
```

#### getFileEntryOfDirEntry
Extract a FileEntry object from a DirectoryEntry.
```js
helper.getFileEntryOfDirEntry(dirEntry, filename); // Promise<FileEntry>
```

