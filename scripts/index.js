const path = require('path');
const { writeToFile, wrapperUmd, getProvinceCode, getCityCode, checkDirExist } = require('./util');
const { cityExtend } = require('./extend');
const createData = require('./createData');

const root = path.join(__dirname, '..');
const MODULE_FILE = path.join(root, 'lcn.js');
const MODULE_FORM_FILE = path.join(root, 'lcn-form.js');
const DATA_FILE = path.join(root, 'data.js');
const PROVINCE_FILE = path.join(root, 'province.js');
const CITY_FILE = path.join(root, 'city.js');
const AREA_FILE = path.join(root, 'area.js');

// 不包含港澳台的级联数据
const MODULE_INLAND_FILE = path.join(root, 'lcn-inland.js');
const MODULE_INLAND_FORM_FILE = path.join(root, 'lcn-form-inland.js');
// 不包含港澳台的省市级联数据
const PROVINCE_CITY_FORM_FILE = path.join(root, 'lcn-form-pc.js');

// 转换form数据
function transformFormData(data) {
  return data.map(item => {
    const ret = {
      value: item.code,
      label: item.name
    }
    if (item.children) {
      ret.children = transformFormData(item.children);
    }
    return ret;
  })
}

// 非内地省代码
const notInlandCode = ['710000', '810000', '820000'];

// 过滤内地省份
function filterInland(data, codeField = 'code') {
  return data.filter(item => notInlandCode.indexOf(item[codeField]) === -1);
}

// 过滤区级数据
function filterArea(data, codeField = 'code') {
  return data.map(item => {
    if (!item.children) {
      return item;
    }
    const newItem = {
      ...item
    }
    newItem.children = newItem.children.map(subItem => {
      delete subItem.children;
      return subItem;
    });
    return newItem;
  });
}

createData().then(() => {
  const originData = {
    data: require('../dist/data.json'),
    province: require('../dist/province.json'),
    city: require('../dist/city.json'),
    area: require('../dist/area.json')
  }

  // 级联补充市级数据，联动区级
  const cities = [...originData.city, ...cityExtend].map(item => {
    const cityCode = getCityCode(item.code);
    const newItem = {
      ...item
    };

    originData.area.forEach(areaItem => {
      if (getCityCode(areaItem.code) === cityCode) {
        if (!newItem.children) {
          newItem.children = [areaItem];
        } else {
          newItem.children.push(areaItem);
        }
      }
    });
    return newItem;
  });

  const provinces = originData.province.map(item => {
    const provinceCode = getProvinceCode(item.code);
    const newItem = {
      ...item
    };

    cities.forEach(cityItem => {
      if (getProvinceCode(cityItem.code) === provinceCode) {
        if (!newItem.children) {
          newItem.children = [cityItem];
        } else {
          newItem.children.push(cityItem);
        }
      }
    });
    return newItem;
  });

  const provincesForm = transformFormData(provinces);

  checkDirExist(root);

  // 级联数据
  writeToFile(MODULE_FILE, wrapperUmd('lcn', JSON.stringify(provinces)));
  // 级联数据，兼容表单
  writeToFile(MODULE_FORM_FILE, wrapperUmd('lcnForm', JSON.stringify(provincesForm)));

  // 内地级联数据
  writeToFile(MODULE_INLAND_FILE, wrapperUmd('lcnInland', JSON.stringify(filterInland(provinces))));
  // 内地级联数据，兼容表单
  writeToFile(MODULE_INLAND_FORM_FILE, wrapperUmd('lcnInlandForm', JSON.stringify(filterInland(provincesForm, 'value'))));
  // 内地省市级联数据，兼容表单
  writeToFile(PROVINCE_CITY_FORM_FILE, wrapperUmd('lcnPCForm', JSON.stringify(filterArea(filterInland(provincesForm, 'value')))));

  // 全部数据
  writeToFile(DATA_FILE, wrapperUmd('lcnData', JSON.stringify(originData.data)));
  // 省级数据
  writeToFile(PROVINCE_FILE, wrapperUmd('lcnProvince', JSON.stringify(originData.province)));
  // 市级数据
  writeToFile(CITY_FILE, wrapperUmd('lcnCity', JSON.stringify(originData.city)));
  // 区级数据
  writeToFile(AREA_FILE, wrapperUmd('lcnArea', JSON.stringify(originData.area)));
});