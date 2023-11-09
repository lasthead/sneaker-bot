import {parse} from "node-html-parser";
import {ProductInterface, ComparedList} from './interfaces';

export const tableParser = async (fileName, file) => {
  const root = parse(file);

  let beginRow = 0
  const rows = root.querySelectorAll('tbody tr');
  let collection = '';
  let brandName = fileName.replace('.html', '');
  let checkModeBrand = false;
  const products = [];

  const fileNameToBrands: ComparedList = {
    'adidas': {
      name: "Adidas",
    },
    'jordan': {
      name: "Nike",
      collection: 'Jordan'
    },
    'sb': {
      name: "Nike",
      collection: 'SB'
    },
    'sb(nike)': {
      name: "Nike",
      collection: 'SB'
    },
    'nb': {
      name: "New Balance",
    },
    'af1': {
      name: "Nike",
      collection: 'AF1'
    },
    'nike': {
      name: "Nike",
    },
    'yeezy': {
      name: "Adidas",
      collection: 'YEEZY',
    },
    'af1shadow': {
      name: "Nike",
      collection: 'AF1 Shadow',
    },
  }

  if (brandName.toLowerCase() === 'Др. бренды'.toLowerCase()) {
    brandName = '';
    checkModeBrand = true;
  } else {
    const name = brandName.replace(' ', '').toLowerCase();
    brandName = fileNameToBrands[name]?.name;

    if (fileNameToBrands[name]?.collection) {
      collection = fileNameToBrands[name].collection;
    }
  }

  root.querySelectorAll('tbody tr').forEach((tr, index) => {
    if (tr.textContent.includes("Фото")) {
      beginRow = index + 1
    }
  })

  for (let i = beginRow; i < rows.length; i++) {
    const sizes = rows[beginRow].querySelectorAll('[dir=ltr]').map((cell) => {
      return { size: Number(cell.text), count: 0 }
    });

    const product: ProductInterface = {
      picture: rows[i].querySelector('img')?.attrs?.src.replace(/=w(\d*)-h(\d*)/, ''),
      sizes: sizes,
      brand: brandName,
      collection: undefined,
      article: undefined,
      material: undefined,
      price: undefined,
      discount: undefined,
      link: undefined,
    }

    if (!product.picture) {
      continue;
    }


    const productDelimiter = rows[i-1].querySelector('td[colspan]');

    if (productDelimiter && Number(productDelimiter?.attrs?.colspan) > 5) {
      if (checkModeBrand) {
        brandName = productDelimiter?.text;
        collection = '';
        product.brand = brandName;
      } else if(productDelimiter?.text) {
        if (brandName?.toLowerCase().trim() !== productDelimiter.text.toLowerCase().trim()) {
          collection = productDelimiter.text.trim();
        } else {
          collection = '';
        }
      }
    }

    const cells = rows[i].querySelectorAll('td')

    if (collection) {
      product.collection = collection
    }

    product.article = cells[0].text
    product.material = cells[3].text

    for (let c = 4; c < sizes.length + 4; c++) {
      product.sizes[c - 4].count = Number(cells[c]?.text) || 0
    }

    const priceValues = cells[cells.length - 2]?.text.split('/') || ''
    if (priceValues[0]) {
      product.price = Number(priceValues[0])
      product.discount = Number(priceValues[1])
    } else {
      cells[sizes.length]?.text
    }

    const link = rows[i]?.querySelector('a')?.getAttribute('href')
    if (link) {
      product.link = link
    }

    products.push(product);
  }

  return products;
}
