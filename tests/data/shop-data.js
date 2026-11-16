const shopUrl = 'https://demowebshop.tricentis.com';

const products = {
  smartphone: {
    id: 43,
    name: 'Smartphone',
    url: `${shopUrl}/smartphone`,
    quantitySelector: '#addtocart_43_EnteredQuantity',
    addButton: '#add-to-cart-button-43',
  },
  book: {
    id: 13,
    name: 'Computing and Internet',
    url: `${shopUrl}/computing-and-internet`,
    quantitySelector: '#addtocart_13_EnteredQuantity',
    addButton: '#add-to-cart-button-13',
  },
  phoneCover: {
    id: 80,
    name: 'Phone Cover',
    url: `${shopUrl}/phone-cover`,
    quantitySelector: '#addtocart_80_EnteredQuantity',
    addButton: '#add-to-cart-button-80',
  },
};

function getTestCredentials() {
  return {
    email: process.env.LOGIN_EMAIL,
    password: process.env.LOGIN_PASSWORD,
  };
}

module.exports = { getTestCredentials, products, shopUrl };
