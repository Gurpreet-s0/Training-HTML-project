/* Browser-only command lab. It simulates a tiny safe Linux filesystem. */
document.addEventListener('DOMContentLoaded', function () {
  var storageKey = 'linuxHubCommandLabProgress.v2';
  var missions = [
    { id: 1, title: 'See what is here', topic: 'Navigation', skill: 'File discovery', level: 'Beginner', xp: 25, objective: 'ls -la', description: 'List every file in your home directory, including hidden files.', hint: 'Use ls with both the long-listing and all-files flags.', check: function (command) { return /^ls\s+(-[a-z]*l[a-z]*a|-?[a-z]*a[a-z]*l|--all\s+-l|-l\s+--all)\s*$/.test(command); } },
    { id: 2, title: 'Create a project space', topic: 'Files', skill: 'Create directories', level: 'Beginner', xp: 30, objective: 'mkdir projects', description: 'Create a directory named projects in your current location.', hint: 'mkdir means make directory. Put the new name after it.', check: function (command) { return /^mkdir\s+projects\/?\s*$/.test(command); } },
    { id: 3, title: 'Move into Documents', topic: 'Navigation', skill: 'Change locations', level: 'Beginner', xp: 30, objective: 'cd documents', description: 'Change into the documents directory from your home folder.', hint: 'cd changes directory. You can use a folder name when it is beside you.', check: function (command) { return /^cd\s+(?:\/home\/learner\/)?documents\/?\s*$/.test(command); } },
    { id: 4, title: 'Make a first note', topic: 'Files', skill: 'Create files', level: 'Beginner', xp: 35, objective: 'touch notes.txt', description: 'Create an empty notes.txt file. You can do this from any directory in the sandbox.', hint: 'touch creates an empty file when it does not already exist.', check: function (command) { return /^touch\s+notes\.txt\s*$/.test(command); } },
    { id: 5, title: 'Find text files', topic: 'Search', skill: 'Search by type', level: 'Intermediate', xp: 45, objective: 'find . -type f -name "*.txt"', description: 'Find every text file below your current location.', hint: 'Start with find ., include -type f, and use -name with a *.txt pattern.', check: function (command) { return command.indexOf('find ') === 0 && command.indexOf('-type f') > -1 && /-name\s+['"]?\*\.txt['"]?/.test(command); } },
    { id: 6, title: 'Read the system disk', topic: 'System', skill: 'Disk space', level: 'Intermediate', xp: 45, objective: 'df -h', description: 'Display disk use in a format people can read.', hint: 'The -h flag means human readable.', check: function (command) { return /^df\s+-h\s*$/.test(command); } },
    { id: 7, title: 'Search a log', topic: 'Search', skill: 'Text filtering', level: 'Intermediate', xp: 55, objective: 'grep -n error system.log', description: 'Find lines containing error in system.log and include their line numbers.', hint: 'grep searches inside a file; -n adds line numbers.', check: function (command) { return /^grep\s+-n\s+['"]?error['"]?\s+(?:\.\/)?system\.log\s*$/i.test(command); } },
    { id: 8, title: 'Inspect your location', topic: 'Navigation', skill: 'Path awareness', level: 'Beginner', xp: 25, objective: 'pwd', description: 'Print the full path of the directory you are currently working in.', hint: 'pwd is short for print working directory.', check: function (command) { return /^pwd\s*$/.test(command); } }
  ];
  var get = function (id) { return document.getElementById(id); };
  var output = get('terminal-output');
  var input = get('terminal-input');
  var currentDirectory = '/home/learner';
  var activeMission = 0;
  var lastCommand = '';
  var history = [];
  var historyIndex = 0;
  var filesystem = {
    '/home/learner': { dirs: ['documents', 'downloads'], files: ['.bashrc', '.profile', 'system.log', 'welcome.txt'] },
    '/home/learner/documents': { dirs: ['work'], files: ['guide.txt', 'todo.md'] },
    '/home/learner/documents/work': { dirs: [], files: ['brief.txt'] },
    '/home/learner/downloads': { dirs: [], files: ['linux-cheatsheet.pdf'] },
    '/home/learner/projects': { dirs: [], files: ['README.md'] }
  };
  var progress = loadProgress();

  function loadProgress() {
    try {
      var saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved && Array.isArray(saved.completed) && Number.isFinite(saved.xp)) return saved;
    } catch (error) { /* Storage is optional. */ }
    return { completed: [], xp: 0, lastActivity: null };
  }
  function saveProgress() {
    try { localStorage.setItem(storageKey, JSON.stringify(progress)); } catch (error) { /* No persistence is still usable. */ }
  }
  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, function (char) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]; });
  }
  function relativePath(path) { return path === '/home/learner' ? '~' : path.replace('/home/learner', '~'); }
  function line(text, kind, html) {
    var entry = document.createElement('div');
    entry.className = 'terminal-line ' + (kind || 'output');
    entry.innerHTML = html ? text : escapeHtml(text);
    output.appendChild(entry);
    output.scrollTop = output.scrollHeight;
  }
  function promptLine(command) {
    line('<span class="terminal-prompt">learner@linuxhub:' + escapeHtml(relativePath(currentDirectory)) + '$</span> <span>' + escapeHtml(command) + '</span>', 'command', true);
  }
  function resolvePath(raw) {
    var next = (raw || '').trim();
    if (!next || next === '~') return '/home/learner';
    if (next.indexOf('~/') === 0) next = '/home/learner/' + next.slice(2);
    if (next.charAt(0) !== '/') next = currentDirectory + '/' + next;
    var parts = [];
    next.split('/').forEach(function (part) {
      if (!part || part === '.') return;
      if (part === '..') parts.pop(); else parts.push(part);
    });
    return '/' + parts.join('/');
  }
  function listDirectory(path, long, all) {
    var directory = filesystem[path];
    if (!directory) return 'ls: cannot access ' + path + ': No such file or directory';
    var entries = directory.dirs.map(function (name) { return { name: name, type: 'dir' }; })
      .concat(directory.files.filter(function (name) { return all || name.charAt(0) !== '.'; }).map(function (name) { return { name: name, type: 'file' }; }));
    if (!long) return entries.map(function (entry) { return entry.type === 'dir' ? entry.name + '/' : entry.name; }).join('    ') || '(empty directory)';
    if (all) entries = [{ name: '.', type: 'dir' }, { name: '..', type: 'dir' }].concat(entries);
    return entries.map(function (entry) {
      return (entry.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--') + '  1 learner learners  ' + String(entry.type === 'dir' ? 4096 : 128).padStart(4) + ' Oct 12 10:24 ' + entry.name;
    }).join('\n');
  }
  function addDirectory(name) {
    if (filesystem[currentDirectory].dirs.indexOf(name) === -1) filesystem[currentDirectory].dirs.push(name);
    if (!filesystem[currentDirectory + '/' + name]) filesystem[currentDirectory + '/' + name] = { dirs: [], files: [] };
  }
  function addFile(name) {
    if (filesystem[currentDirectory].files.indexOf(name) === -1) filesystem[currentDirectory].files.push(name);
  }
  function findFiles(path, pattern) {
    var found = [];
    function visit(location) {
      var directory = filesystem[location];
      if (!directory) return;
      directory.files.forEach(function (file) {
        if ((pattern === '*.txt' && file.slice(-4) === '.txt') || file === pattern) found.push((location.replace(path, '.') + '/' + file).replace('././', './'));
      });
      directory.dirs.forEach(function (folder) { visit(location + '/' + folder); });
    }
    visit(path);
    return found.length ? found.join('\n') : 'No matching files found.';
  }
  function runCommand(raw) {
    var command = raw.trim();
    if (!command) return;
    lastCommand = command;
    history.push(command);
    historyIndex = history.length;
    promptLine(command);
    var bits = command.split(/\s+/);
    var base = bits.shift().toLowerCase();
    var result = '';
    if (base === 'help') result = 'Supported: pwd, ls, cd, mkdir, touch, cat, grep, find, df, whoami, clear, help';
    else if (base === 'pwd') result = currentDirectory;
    else if (base === 'whoami') result = 'learner';
    else if (base === 'clear') { output.innerHTML = ''; status('Terminal cleared. Command history is still available with ↑.'); updateTree(); return; }
    else if (base === 'ls') {
      var flags = bits.filter(function (bit) { return bit.charAt(0) === '-'; }).join('');
      var requested = bits.find(function (bit) { return bit.charAt(0) !== '-'; });
      result = listDirectory(resolvePath(requested), flags.indexOf('l') > -1, flags.indexOf('a') > -1);
    } else if (base === 'cd') {
      var destination = resolvePath(bits.join(' ') || '~');
      if (filesystem[destination]) currentDirectory = destination;
      else result = 'cd: no such file or directory: ' + bits.join(' ');
    } else if (base === 'mkdir') {
      var folder = bits.find(function (bit) { return bit.charAt(0) !== '-'; });
      if (!folder || folder.indexOf('/') > -1) result = 'mkdir: enter a simple folder name for this lab';
      else if (filesystem[currentDirectory].dirs.indexOf(folder) > -1) result = 'mkdir: cannot create directory ' + folder + ': File exists';
      else { addDirectory(folder); result = 'created directory: ' + folder; }
    } else if (base === 'touch') {
      var file = bits[0];
      if (!file || file.indexOf('/') > -1) result = 'touch: enter a simple file name for this lab';
      else { addFile(file); result = 'created file: ' + file; }
    } else if (base === 'cat') {
      var content = { 'welcome.txt': 'Welcome to LinuxHub. Try ls -la, then complete a mission.', 'guide.txt': 'Linux commands are built by doing. Keep experimenting.', 'system.log': 'boot: system ready\ninfo: learning session started\nerror: disk mount delayed\ninfo: recovered automatically\nerror: archive not found' };
      result = content[bits[0]] || 'cat: ' + (bits[0] || 'missing operand') + ': No such file or directory';
    } else if (base === 'grep') {
      var grepFile = bits[bits.length - 1];
      if (grepFile !== 'system.log') result = 'grep: ' + (grepFile || 'missing file') + ': No such file or directory';
      else {
        var withNumbers = bits.indexOf('-n') > -1;
        var needle = (bits.filter(function (bit) { return bit !== '-n' && bit !== grepFile; })[0] || '').replace(/["']/g, '').toLowerCase();
        var log = ['boot: system ready', 'info: learning session started', 'error: disk mount delayed', 'info: recovered automatically', 'error: archive not found'];
        result = log.map(function (text, index) { return { text: text, index: index }; }).filter(function (entry) { return entry.text.toLowerCase().indexOf(needle) > -1; }).map(function (entry) { return (withNumbers ? entry.index + 1 + ':' : '') + entry.text; }).join('\n') || 'no matches found';
      }
    } else if (base === 'find') {
      var match = command.match(/-name\s+['"]?([^'"\s]+)['"]?/);
      result = findFiles(bits[0] === '.' ? currentDirectory : resolvePath(bits[0]), match ? match[1] : '*.txt');
    } else if (base === 'df') result = bits.indexOf('-h') > -1 ? 'Filesystem      Size  Used Avail Use% Mounted on\nlabfs           20G  7.4G   13G  37% /' : 'Filesystem  1K-blocks     Used Available Use% Mounted on\nlabfs        20971520  7759462  13212058  37% /';
    else result = base + ': command not found. Type help to see safe commands.';
    if (result) line(result);
    updatePrompt();
    updateTree();
    status('Command ran. Check the mission when you think you have it.');
  }
  function renderMissions() {
    get('mission-list').innerHTML = missions.map(function (mission, index) {
      var done = progress.completed.indexOf(mission.id) > -1;
      return '<li><button class="mission-button ' + (index === activeMission ? 'active ' : '') + (done ? 'complete' : '') + '" data-mission="' + index + '" type="button"><span class="mission-state">' + (done ? '✓' : String(index + 1).padStart(2, '0')) + '</span><span><b>' + mission.title + '</b><small>' + mission.topic + ' · ' + mission.xp + ' XP</small></span>' + (index === activeMission ? '<i>›</i>' : '') + '</button></li>';
    }).join('');
    document.querySelectorAll('.mission-button').forEach(function (button) { button.addEventListener('click', function () { loadMission(Number(button.dataset.mission)); }); });
  }
  function loadMission(index) {
    activeMission = index;
    var mission = missions[index];
    var complete = progress.completed.indexOf(mission.id) > -1;
    get('mission-number').textContent = String(mission.id).padStart(2, '0');
    get('mission-topic').textContent = mission.topic.toUpperCase();
    get('mission-tag').textContent = mission.level.toUpperCase();
    get('challenge-title').textContent = mission.title;
    get('challenge-description').textContent = mission.description;
    get('objective-command').textContent = mission.objective;
    get('hint-text').textContent = mission.hint;
    get('hint-text').hidden = true;
    get('toggle-hint').classList.remove('shown');
    get('toggle-hint').innerHTML = '<span>?</span> Need a hint?';
    get('mission-skill').textContent = mission.skill;
    get('mission-xp').textContent = mission.xp;
    get('mission-status').textContent = complete ? 'Complete' : 'Ready';
    get('mission-status').className = complete ? 'mission-complete-text' : '';
    get('next-mission').innerHTML = index === missions.length - 1 ? 'Back to first <span>↺</span>' : 'Next mission <span>→</span>';
    renderMissions();
    status(complete ? 'You already earned this mission’s XP. Try the command again anytime.' : 'Objective loaded. Run the command in the terminal below.');
    input.focus();
  }
  function updateProgress() {
    var done = progress.completed.length;
    var percent = Math.round(done / missions.length * 100);
    var level = progress.xp >= 220 ? 'Command Builder · Level 3' : progress.xp >= 100 ? 'Pathfinder · Level 2' : 'Explorer · Level 1';
    get('progress-label').textContent = done + ' of ' + missions.length + ' missions complete';
    get('progress-message').textContent = done === missions.length ? 'Path complete — excellent work!' : done ? (missions.length - done) + ' mission' + (missions.length - done === 1 ? '' : 's') + ' left on this path.' : 'Start with your first command.';
    get('progress-fill').style.width = percent + '%';
    get('progress-percent').textContent = percent + '%';
    get('top-xp').textContent = progress.xp;
    get('learner-level').textContent = level;
    get('streak-count').textContent = progress.lastActivity === new Date().toDateString() ? '1 day streak · active today' : '1 day streak';
  }
  function updatePrompt() { get('prompt-path').textContent = 'learner@linuxhub:' + relativePath(currentDirectory) + '$'; }
  function updateTree() {
    var directory = filesystem[currentDirectory];
    get('current-directory').textContent = currentDirectory;
    get('file-tree').innerHTML = directory.dirs.map(function (name) { return '<li class="folder-item"><span>▸</span>' + escapeHtml(name) + '/</li>'; }).concat(directory.files.map(function (name) { return '<li><span>·</span>' + escapeHtml(name) + '</li>'; })).join('') || '<li class="empty-tree">Empty directory</li>';
  }
  function status(message) { get('terminal-status').textContent = message; }
  function checkMission() {
    var mission = missions[activeMission];
    if (!lastCommand) { status('Run a command in the terminal first.'); input.focus(); return; }
    if (!mission.check(lastCommand)) {
      status('Almost — that command ran, but it does not meet this objective yet. Try the hint if you need it.');
      get('terminal-status').classList.add('needs-work');
      setTimeout(function () { get('terminal-status').classList.remove('needs-work'); }, 650);
      return;
    }
    if (progress.completed.indexOf(mission.id) === -1) {
      progress.completed.push(mission.id);
      progress.xp += mission.xp;
      progress.lastActivity = new Date().toDateString();
      saveProgress();
      line('Mission complete! +' + mission.xp + ' XP earned.', 'success');
      status('Excellent. ' + mission.xp + ' XP saved on this device.');
    } else status('Mission already complete — great repetition.');
    updateProgress();
    loadMission(activeMission);
  }
  get('terminal-form').addEventListener('submit', function (event) { event.preventDefault(); runCommand(input.value); input.value = ''; });
  input.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowUp' && history.length) { event.preventDefault(); historyIndex = Math.max(0, historyIndex - 1); input.value = history[historyIndex]; }
    if (event.key === 'ArrowDown' && history.length) { event.preventDefault(); historyIndex = Math.min(history.length, historyIndex + 1); input.value = historyIndex === history.length ? '' : history[historyIndex]; }
  });
  get('clear-terminal').addEventListener('click', function () { output.innerHTML = ''; input.focus(); });
  get('terminal-help').addEventListener('click', function () { runCommand('help'); input.focus(); });
  get('check-solution').addEventListener('click', checkMission);
  get('next-mission').addEventListener('click', function () { loadMission((activeMission + 1) % missions.length); });
  get('refresh-files').addEventListener('click', updateTree);
  get('toggle-hint').addEventListener('click', function (event) {
    var hint = get('hint-text');
    hint.hidden = !hint.hidden;
    event.currentTarget.classList.toggle('shown', !hint.hidden);
    event.currentTarget.innerHTML = hint.hidden ? '<span>?</span> Need a hint?' : '<span>×</span> Hide hint';
  });
  get('copy-command').addEventListener('click', function (event) {
    var text = missions[activeMission].objective;
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { event.currentTarget.textContent = 'Copied'; setTimeout(function () { event.currentTarget.textContent = 'Copy'; }, 1300); }).catch(function () { input.value = text; input.focus(); });
    else { input.value = text; input.focus(); }
  });
  document.querySelectorAll('.quick-command').forEach(function (button) { button.addEventListener('click', function () { input.value = button.dataset.command; input.focus(); }); });
  get('reset-progress').addEventListener('click', function () {
    if (!window.confirm('Reset your saved XP and completed missions on this device?')) return;
    progress = { completed: [], xp: 0, lastActivity: null };
    saveProgress(); updateProgress(); loadMission(activeMission);
    status('Progress reset. Your terminal sandbox is ready for a new start.');
  });
  line('Welcome to the LinuxHub sandbox. Nothing you type can affect your computer.', 'welcome');
  line('Try the objective above, or type help to explore supported commands.', 'welcome');
  updatePrompt(); updateTree(); updateProgress(); loadMission(0);
});
