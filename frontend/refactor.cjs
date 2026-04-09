const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');
const appFile = path.join(srcDir, 'App.jsx');

const content = fs.readFileSync(appFile, 'utf8');

// We will use basic regex and splitting to chunk the file.
// We know the file starts with imports, then constants, functions, etc.

function extractBlock(startMarker, endMarker) {
    const startIndex = content.indexOf(startMarker);
    if (startIndex === -1) return '';
    let endIndex = endMarker ? content.indexOf(endMarker, startIndex) : content.length;
    if (endIndex === -1) endIndex = content.length;
    return content.slice(startIndex, endIndex);
}

// 1. Gather all common imports
const masterImports = `import React, { Fragment, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Responsive, WidthProvider } from "react-grid-layout";
import {
  FaArrowRightFromBracket, FaBars, FaCalendarDays, FaCamera, FaChartLine,
  FaEye, FaEyeSlash, FaGear, FaHouse, FaPlus, FaUpload, FaUserCheck,
  FaUserGear, FaUserGraduate, FaUserPen, FaUsers, FaVideo, FaPlay
} from "react-icons/fa6";
`;

// Directories
fs.mkdirSync(path.join(srcDir, 'utils'), { recursive: true });
fs.mkdirSync(path.join(srcDir, 'components'), { recursive: true });
fs.mkdirSync(path.join(srcDir, 'pages'), { recursive: true });
fs.mkdirSync(path.join(srcDir, 'pages', 'admin'), { recursive: true });
fs.mkdirSync(path.join(srcDir, 'pages', 'faculty'), { recursive: true });
fs.mkdirSync(path.join(srcDir, 'pages', 'student'), { recursive: true });

// We need to parse components robustly by grabbing code between top-level functions
function extractFunctions(code) {
    const functions = [];
    const functRegex = /^function\s+([A-Z][a-zA-Z0-9_]*)\s*\(/gm;
    let match;
    let matches = [];
    while ((match = functRegex.exec(code)) !== null) {
        matches.push(match);
    }
    
    for (let i = 0; i < matches.length; i++) {
        const name = matches[i][1];
        const startIndex = matches[i].index;
        let endIndex;
        if (i + 1 < matches.length) {
            endIndex = matches[i + 1].index;
        } else {
            const expMatch = code.indexOf('export default App;');
            endIndex = expMatch !== -1 ? expMatch : code.length;
        }
        functions.push({
            name,
            code: code.slice(startIndex, endIndex).trim()
        });
    }
    return functions;
}

const allFunctions = extractFunctions(content);

// We'll also extract constants by searching for const / let at module level.
// Since it's easier, we'll just extract the top block of code before "function App()"
const topBlockEnd = content.indexOf('function App()');
const topBlock = content.slice(0, topBlockEnd);

const constantsBlockMatch = topBlock.match(/const THEME_KEY[\s\S]*?(?=function apiUrl)/);
const constants1 = constantsBlockMatch ? constantsBlockMatch[0] : '';

const navDataMatch = topBlock.match(/const adminNav[\s\S]*?(?=const ResponsiveGridLayout)/);
const constants2 = navDataMatch ? navDataMatch[0] : '';
const gridLayoutConsts = topBlock.match(/const ResponsiveGridLayout[\s\S]*?(?=function App)/);
const constants3 = gridLayoutConsts ? gridLayoutConsts[0] : '';

// Functions in top block (not capitalized components)
// We'll capture them by regex
const utilsCodeMatches = topBlock.match(/function [a-z][\s\S]*?(?=function AuthGate|const adminNav)/g);
let utilsCode = '';
if (utilsCodeMatches) {
    utilsCode = utilsCodeMatches.join('\n\n');
}
// Add persistAuth, clearAuth etc which are inside
const persistAuthMatch = topBlock.match(/function persistAuth[\s\S]*?(?=function useSessionProfile)/);
const useSessionProfileMatch = topBlock.match(/function useSessionProfile[\s\S]*?(?=function clearAuth)/);
const clearAuthMatch = topBlock.match(/function clearAuth[\s\S]*?(?=const adminNav)/);

utilsCode += (persistAuthMatch ? '\n' + persistAuthMatch[0] : '') + 
             (useSessionProfileMatch ? '\n' + useSessionProfileMatch[0] : '') + 
             (clearAuthMatch ? '\n' + clearAuthMatch[0] : '');

// Now we write out constants.js
const constantsExports = "export {\n" +
    "THEME_KEY, FACULTY_KEY, STUDENT_KEY, AUTH_TOKEN_KEY, AUTH_ROLE_KEY, AUTH_USER_KEY, API_BASE_URL, SIDEBAR_LOGO_URL,\n" +
    "adminNav, facultyNav, studentNav, iconMap, studentStats, adminStats, facultyStats, todaysClasses, recentAttendance, facultyStudents, weeklyTimetable,\n" +
    "ResponsiveGridLayout, FACULTY_DASHBOARD_KEY, FACULTY_GRID_COLS, facultyWidgetCatalog, defaultFacultyWidgets\n" +
"};";

const constantsFile = 'import { FaArrowRightFromBracket, FaBars, FaCalendarDays, FaCamera, FaChartLine, FaEye, FaEyeSlash, FaGear, FaHouse, FaPlus, FaUpload, FaUserCheck, FaUserGear, FaUserGraduate, FaUserPen, FaUsers, FaVideo, FaPlay } from "react-icons/fa6";\n' +
'import { Responsive, WidthProvider } from "react-grid-layout";\n\n' +
constants1.replace(/const/g, 'export const') + '\n' +
constants2.replace(/const/g, 'export const') + '\n' +
constants3.replace(/const/g, 'export const');
fs.writeFileSync(path.join(srcDir, 'utils', 'constants.js'), constantsFile.replace(/export export/g, 'export'));

// Define the exports in utils code
let authFile = 'import { useState, useEffect } from "react";\n' +
'import { AUTH_TOKEN_KEY, AUTH_ROLE_KEY, AUTH_USER_KEY, API_BASE_URL } from "./constants";\n\n' +
utilsCode + '\n\n' +
'export { apiUrl, getDashboardPath, getStoredAuthRole, getStoredAuthUser, hasAuthToken, isFacultyRole, toInitials, buildProfileFromUser, persistAuth, useSessionProfile, clearAuth };\n';
fs.writeFileSync(path.join(srcDir, 'utils', 'auth.js'), authFile);


// Group all React components
const pageNames = [];
const sharedNames = ['AuthGate', 'RequireFacultyAuth', 'RequireAdminAuth', 'PageShell', 'SectionCard', 'StatGrid', 'SimpleTable', 'ProfileFields', 'FormGrid'];

let sharedCode = masterImports + '\nimport { getStoredAuthRole, getStoredAuthUser, hasAuthToken, apiUrl, clearAuth, persistAuth, buildProfileFromUser } from "../utils/auth";\nimport { THEME_KEY, SIDEBAR_LOGO_URL, iconMap } from "../utils/constants";\n\n';

allFunctions.forEach(func => {
    if (func.name === 'App' || func.name === 'AppShell') return; // Handled separately
    
    if (sharedNames.includes(func.name)) {
        sharedCode += func.code + '\n\n';
    } else {
        // It's a page component
        const isAdmin = func.name.startsWith('Admin');
        const isFaculty = func.name.startsWith('Faculty') || func.name.startsWith('FaceRegistrations') || func.name.startsWith('Manual') || func.name.startsWith('AttendanceResult');
        const isStudent = func.name.startsWith('Student') || func.name.startsWith('RegisterStudent');
        const isLogin = func.name === 'LoginPage';
        
        let folder = 'pages';
        if (isAdmin) folder = 'pages/admin';
        else if (isFaculty) folder = 'pages/faculty';
        else if (isStudent) folder = 'pages/student';
        
        const fileContent = masterImports + '\n' +
'import { apiUrl, getDashboardPath, getStoredAuthRole, getStoredAuthUser, hasAuthToken, persistAuth, useSessionProfile, isFacultyRole } from "../../utils/auth";\n' +
'import * as C from "../../utils/constants";\n' +
'import { PageShell, SectionCard, StatGrid, SimpleTable, ProfileFields, FormGrid } from "../../components/Shared";\n\n' +
func.code + '\n\nexport default ' + func.name + ';\n';

        let replacedContent = fileContent.replace(/..\/..\/utils/g, isLogin ? '../utils' : '../../utils').replace(/..\/..\/components/g, isLogin ? '../components' : '../../components');


        // We replace usages of constants directly assuming they exist on C or importing directly
        let repairedContent = fileContent.replace(/import \* as C from ".*?";/, 
        'import { adminNav, facultyNav, studentNav, studentStats, adminStats, facultyStats, todaysClasses, recentAttendance, facultyStudents, weeklyTimetable, FACULTY_DASHBOARD_KEY, FACULTY_GRID_COLS, defaultFacultyWidgets, facultyWidgetCatalog, FACULTY_KEY, STUDENT_KEY, SIDEBAR_LOGO_URL } from "' + (isLogin ? '../utils/constants' : '../../utils/constants') + '";\n' +
        'import { normalizeFacultyLayout, getWidgetSizeClass } from "' + (isLogin ? '../utils/constants' : '../../utils/constants') + '";'); // Will add helpers below
        
        fs.writeFileSync(path.join(srcDir, folder, func.name + '.jsx'), repairedContent);
        pageNames.push({ name: func.name, path: (isLogin ? '.' : folder.replace('pages/', './')) + '/' + func.name });
    }
});

// Since normalizeFacultyLayout/getWidgetSizeClass are functions inside the grid layout constants block, they get exported. Let's make sure they are in constants.js
fs.appendFileSync(path.join(srcDir, 'utils', 'constants.js'), '\nexport function normalizeFacultyLayout(layout) { return layout.map((item) => { const catalogItem = facultyWidgetCatalog.find((widget) => widget.id === item.i); const fallbackW = catalogItem?.size.w || 3; const fallbackH = catalogItem?.size.h || 3; const safeW = Math.max(1, Math.min(Number(item.w || fallbackW), FACULTY_GRID_COLS)); const safeX = Math.max(0, Math.min(Number(item.x || 0), FACULTY_GRID_COLS - safeW)); return { ...item, w: safeW, h: Math.max(1, Number(item.h || fallbackH)), x: safeX, y: Math.max(0, Number(item.y || 0)), }; }); }\nexport function getWidgetSizeClass(layoutItem) { const width = Number(layoutItem?.w || 0); const height = Number(layoutItem?.h || 0); if (width <= 2 || height <= 2) return "tiny"; if (width <= 3 || height <= 3) return "compact"; return "regular"; }\n');

// Write Shared.jsx
sharedCode += '\nexport { AuthGate, RequireFacultyAuth, RequireAdminAuth, PageShell, SectionCard, StatGrid, SimpleTable, ProfileFields, FormGrid };\n';
fs.writeFileSync(path.join(srcDir, 'components', 'Shared.jsx'), sharedCode);


// Write Main App.jsx
let newAppContent = masterImports + '\n' +
'import { getDashboardPath, getStoredAuthRole } from "./utils/auth";\n' +
'import { THEME_KEY } from "./utils/constants";\n' +
'import { RequireAdminAuth, RequireFacultyAuth } from "./components/Shared";\n';

pageNames.forEach(page => {
    newAppContent += 'import ' + page.name + ' from "./pages/' + page.path + '";\n';
});

const appBlock = allFunctions.find(f => f.name === 'App').code;
const appShellBlock = allFunctions.find(f => f.name === 'AppShell').code;

newAppContent += '\n\n' + appBlock + '\n\n' + appShellBlock + '\n\nexport default App;\n';

fs.writeFileSync(path.join(srcDir, 'App.jsx'), newAppContent);
console.log('Successfully refactored App.jsx!');

