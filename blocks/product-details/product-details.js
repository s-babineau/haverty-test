/* eslint-disable import/no-unresolved */

import {
  InLineAlert,
  Icon,
  Button,
  provider as UI,
} from '@dropins/tools/components.js';
import { events } from '@dropins/tools/event-bus.js';
import * as pdpApi from '@dropins/storefront-pdp/api.js';
import { render as pdpRendered } from '@dropins/storefront-pdp/render.js';

// Containers
import ProductHeader from '@dropins/storefront-pdp/containers/ProductHeader.js';
import ProductPrice from '@dropins/storefront-pdp/containers/ProductPrice.js';
import ProductShortDescription from '@dropins/storefront-pdp/containers/ProductShortDescription.js';
import ProductOptions from '@dropins/storefront-pdp/containers/ProductOptions.js';
import ProductQuantity from '@dropins/storefront-pdp/containers/ProductQuantity.js';
import ProductDescription from '@dropins/storefront-pdp/containers/ProductDescription.js';
import ProductAttributes from '@dropins/storefront-pdp/containers/ProductAttributes.js';
import ProductGallery from '@dropins/storefront-pdp/containers/ProductGallery.js';
import ProductDetails from '@dropins/storefront-pdp/containers/ProductDetails.js';
import trackViewedProduct from '../../scripts/api/productTracking.js';

// Libs
import { setJsonLd } from '../../scripts/commerce.js';
import { fetchPlaceholders } from '../../scripts/aem.js';

// Initializers
import { IMAGES_SIZES } from '../../scripts/initializers/pdp.js';
import '../../scripts/initializers/cart.js';

export default async function decorate(block) {
  // eslint-disable-next-line no-underscore-dangle
  const product = events._lastEvent?.['pdp/data']?.payload ?? null;
  const labels = await fetchPlaceholders();

  // Layout
  const fragment = document.createRange().createContextualFragment(`
    <div class="product-details__wrapper">
      <div class="product-details__alert"></div>
      <div class="product-details__left-column">
        <div class="product-details__gallery"></div>
      </div>
      <div class="product-details__right-column">
        <div class="product-details__header"></div>
        <div class="product-details__price"></div>
        <div class="product-details__gallery"></div>
        <div class="product-details__short-description"></div>
        <div class="product-details__configuration">
          <div class="product-details__options"></div>
          <div class="product-details__quantity"></div>
          <div class="product-details__buttons">
            <div class="product-details__buttons__add-to-cart"></div>
            <div class="product-details__buttons__add-to-wishlist"></div>
          </div>
        </div>
        <div class="product-details__description"></div>
        <div class="product-details__attributes"></div>
      </div>
    </div>
  `);

  const $alert = fragment.querySelector('.product-details__alert');
  const $gallery = fragment.querySelector('.product-details__gallery');
  const $header = fragment.querySelector('.product-details__header');
  const $price = fragment.querySelector('.product-details__price');
  const $galleryMobile = fragment.querySelector('.product-details__right-column .product-details__gallery');
  const $shortDescription = fragment.querySelector('.product-details__short-description');
  const $options = fragment.querySelector('.product-details__options');
  const $quantity = fragment.querySelector('.product-details__quantity');
  const $addToCart = fragment.querySelector('.product-details__buttons__add-to-cart');
  const $addToWishlist = fragment.querySelector('.product-details__buttons__add-to-wishlist');
  const $description = fragment.querySelector('.product-details__description');
  const $attributes = fragment.querySelector('.product-details__attributes');

  block.appendChild(fragment);

  // Alert
  let inlineAlert = null;

  // Render Containers
  const [
    _galleryMobile,
    _gallery,
    _header,
    _price,
    _shortDescription,
    _options,
    _quantity,
    addToCart,
    addToWishlist,
    _description,
    _attributes,
  ] = await Promise.all([
    // Gallery (Mobile)
    pdpRendered.render(ProductGallery, {
      controls: 'thumbnailsRow',
      loop: false,
      peak: false,
      gap: 'small',
      arrows: true,
      imageParams: {
        wid: 800,
        hei: 800,
      },
      thumbnailParams: {
        wid: 150,
        hei: 150,
      },
      zoom: {
        closeButton: true,
      },
    })($galleryMobile),

    // Gallery (Desktop)
    pdpRendered.render(ProductGallery, {
      controls: 'thumbnailsRow',
      loop: false,
      peak: false,
      gap: 'small',
      arrows: true,
      imageParams: {
        wid: 800,
        hei: 800,
      },
      thumbnailParams: {
        wid: 150,
        hei: 150,
      },
      zoom: {
        closeButton: true,
      },
    })($gallery),

    // Header
    pdpRendered.render(ProductHeader, {})($header),

    // Price
    pdpRendered.render(ProductPrice, {})($price),

    // Short Description
    pdpRendered.render(ProductShortDescription, {})($shortDescription),

    // Configuration - Swatches
    pdpRendered.render(ProductOptions, { hideSelectedValue: false })($options),

    // Configuration  Quantity
    pdpRendered.render(ProductQuantity, {slots: {
    Quantity: (ctx) => {
      // quantity decoration
      const quantity = document.createElement('div');
      quantity.classList.add('quantity-decoration');
      quantity.innerText = 'Quantity';
      ctx.prependChild(quantity);

      const promo = document.createElement('div');
      promo.classList.add('promo');
      promo.innerText = 'Buy 2, Get 1 Free';
      ctx.appendChild(promo);

      ctx.onChange((next) => {
        quantity.innerText = `${next.dictionary.Custom.quantityLabel}`;
        promo.innerText = `${next.dictionary.Custom.promoLabel}:`;
      });
    },
  },})($quantity),

    // Configuration – Button - Add to Cart
    UI.render(Button, {
      children: labels.PDP?.Product?.AddToCart?.label,
      icon: Icon({ source: 'Cart' }),
      onClick: async () => {
        try {
          addToCart.setProps((prev) => ({
            ...prev,
            children: labels.Custom?.AddingToCart?.label,
            disabled: true,
          }));

          // get the current selection values
          const values = pdpApi.getProductConfigurationValues();
          const valid = pdpApi.isProductConfigurationValid();

          // add the product to the cart
          if (valid) {
            const { addProductsToCart } = await import('@dropins/storefront-cart/api.js');
            await addProductsToCart([{ ...values }]);
          }

          // reset any previous alerts if successful
          inlineAlert?.remove();
        } catch (error) {
          // add alert message
          inlineAlert = await UI.render(InLineAlert, {
            heading: 'Error',
            description: error.message,
            icon: Icon({ source: 'Warning' }),
            'aria-live': 'assertive',
            role: 'alert',
            onDismiss: () => {
              inlineAlert.remove();
            },
          })($alert);

          // Scroll the alertWrapper into view
          $alert.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        } finally {
          addToCart.setProps((prev) => ({
            ...prev,
            children: labels.PDP?.Product?.AddToCart?.label,
            disabled: false,
          }));
        }
      },
    })($addToCart),

    // Configuration - Add to Wishlist
    UI.render(Button, {
      icon: Icon({ source: 'Heart' }),
      variant: 'secondary',
      'aria-label': labels.Custom?.AddToWishlist?.label,
      onClick: async () => {
        try {
          addToWishlist.setProps((prev) => ({
            ...prev,
            disabled: true,
            'aria-label': labels.Custom?.AddingToWishlist?.label,
          }));

          const values = pdpApi.getProductConfigurationValues();

          if (values?.sku) {
            const wishlist = await import('../../scripts/wishlist/api.js');
            await wishlist.addToWishlist(values.sku);
          }
        } catch (error) {
          console.error(error);
        } finally {
          addToWishlist.setProps((prev) => ({
            ...prev,
            disabled: false,
            'aria-label': labels.Custom?.AddToWishlist?.label,
          }));
        }
      },
    })($addToWishlist),

    // Description
    pdpRendered.render(ProductDescription, {})($description),

    // Attributes
    pdpRendered.render(ProductAttributes, {})($attributes),

    pdpRendered.render(ProductDetails, {
      sku: product.sku,
      hideSku: true,
      hideURLParams: true,
      hideQuantity: true,
      hideShortDescription: true,
      hideDescription: true,
      hideAttributes: true,
      carousel: {
        controls: {
          desktop: 'thumbnailsRow',
          mobile: 'thumbnailsRow',
        },
        arrowsOnMainImage: true,
        loopable: false,
        peak: {
          mobile: false,
          desktop: false,
        },
        gap: 'small',
        thumbnailParams: false,
        imageParams: false,
        thumbnailsLoadingMode: 'lazy',
      },
      slots: {
        SpecialPrice: (ctx) => {
          // Ratings
          const ratings = ctx.data.attributes.find((attribute) => attribute.id === 'hvt_29')?.value || null;
          const reviewsCount = ctx.data.attributes.find((attribute) => attribute.id === 'hvt_51')?.value || null;
          ctx.appendSibling(createProductRatingStructure(product.name, ratings, reviewsCount));
        },
        Actions: (ctx) => {
          // handle cart protection plan
          const mainContent = document.querySelector('#main-content');
          const cartProtectionPopup = document.createElement('div');
          mainContent.appendChild(cartProtectionPopup);
          cartProtectionPopup.id = 'cart-protection-plan';
          window.addEventListener('click', (event) => {
            if (event.target.id === 'cart-protection-plan') {
              cartProtectionPopup.style.bottom = '-100%';
            }
          });
          // Add to Cart Button
          ctx.appendButton((next, state) => {
            // eslint-disable-next-line no-shadow
            const addingToCart = async (next, state) => {
              try {
                state.set('adding', true);

                if (!next.valid) {
                  console.error('Invalid product', next.values);
                  return;
                }

                const variantSku = document.querySelector('.pdp-product')?.getAttribute('data-variant-sku');
                const defaultSku = ctx.data.attributes.find((attr) => attr.id === 'hvt_30')?.value || null;
                next.values.sku = variantSku ?? defaultSku;

                const addToCartResp = await addProductsToCart([{ ...next.values }]);
                store.setCartId(addToCartResp.id);

                // update the browser persistance cartId
                let browserCartData = localStorage.getItem('M2_VENIA_BROWSER_PERSISTENCE__cartId');
                if (browserCartData) {
                  browserCartData = JSON.parse(browserCartData);
                  browserCartData.value = `"${addToCartResp.id}"`;
                  browserCartData.timeStored = Date.now();
                  localStorage.setItem('M2_VENIA_BROWSER_PERSISTENCE__cartId', JSON.stringify(browserCartData));
                }
                const cartQuantity = document.getElementById('cartQuantity');
                cartQuantity.innerHTML = `Cart (${addToCartResp.totalQuantity})`;

                if (addToCartResp.totalQuantity) {
                  cartApi.toggleCart();
                }
              } catch (error) {
                console.error('Error adding product to cart', error);
              } finally {
                state.set('adding', false);
              }
            };

            const handleProtectionPlan = (parentCategory) => {
              cartProtectionPopup.innerHTML = mobileProtectionPlan(parentCategory);
              cartProtectionPopup.style.bottom = '0';
              cartProtectionPopup.style.display = 'flex';

              const closePopup = document.querySelector('.close-popup-pdp');
              closePopup.addEventListener('click', () => {
                cartProtectionPopup.style.bottom = '-100%';
              });

              const addProtection = async () => {
                cartProtectionPopup.style.bottom = '-100%';
                const cartCount = store.getCart();
                if (cartCount.total_quantity === 0) {
                  sessionStorage.clear();
                  itemSequenceNumber = 1;
                  sessionStorage.setItem('itemSequenceNumber', itemSequenceNumber);
                }
                const items = {
                  id: itemSequenceNumber,
                  product: {
                    sku: next.values.sku,
                  },
                  warranty_type: 'GOLD_PLAN',
                };
                try {
                  await addingToCart(next, state);
                  await addWarrantyToCartItem(items);
                } catch (error) {
                  console.error(`Error adding warranty for item with sequenceNumber: ${itemSequenceNumber}`, error);
                } finally {
                  itemSequenceNumber++;
                  sessionStorage.setItem('itemSequenceNumber', itemSequenceNumber);
                }
              };

              const noThanks = async () => {
                cartProtectionPopup.style.bottom = '-100%';
                await addingToCart(next, state);
              };

              document.querySelector('#add-protection').addEventListener('click', addProtection);
              document.querySelector('#no-thanks').addEventListener('click', noThanks);
            };

            return {
              text: state.get('adding')
                ? next.dictionary.Custom.AddingToCart?.label
                : next.dictionary.PDP.Product.AddToCart?.label,
              icon: 'Cart',
              variant: 'primary',
              disabled: state.get('adding') || !next.data.inStock,
              onClick: async () => {
                const breadcrumbLinks = document.querySelectorAll('.breadcrumb-links a');
                const parentCategory = breadcrumbLinks.length > 1 ? breadcrumbLinks[1].textContent.trim() : null;
                const protectionCategories = ['Living Room', 'Bedroom', 'Dining Room'];
                const { mobile } = detectDevice();

                if (parentCategory && protectionCategories.includes(parentCategory) && mobile) {
                  handleProtectionPlan(parentCategory);
                } else {
                  await addingToCart(next, state);
                }
              },
            };
          });

          // Delivery estimate
          const deliveryEstimateContainer = document.createElement('div');
          ctx.appendSibling(deliveryEstimateContainer);

          Promise.all([
            loadCSS(`${window.hlx.codeBasePath}/blocks/delivery-estimate/delivery-estimate.css`),
            import('../delivery-estimate/delivery-estimate.js'),
          ])
            .then(([, { default: decorateDeliveryEstimate }]) => {
              const loadEstimateDelivery = (newCtx) => {
                const variantSku =
                  newCtx.data.variantSku ??
                  newCtx.data.attributes.find((attribute) => attribute?.id === 'hvt_30')?.value ??
                  newCtx.data.sku;
                const availableInStores = newCtx.data.attributes.find((attribute) => attribute?.id === 'hvt_56')?.value;

                deliveryEstimateContainer.dataset.availableInStores = availableInStores;
                deliveryEstimateContainer.dataset.variantSku = variantSku;

                // Decorate delivery estimate block.
                decorateDeliveryEstimate(deliveryEstimateContainer);
              };
              loadEstimateDelivery(ctx);
              ctx.onChange(loadEstimateDelivery);
            })
            .catch((error) => console.error(error));
        },
        Options: (ctx) => {
          ctx.onChange(async (event) => {
            const { data } = event;

            // Emit a pdp/data-from-slot event since the pdp/data event is broken.
            events.emit('pdp/data-from-slot', {
              ...product,
              ...data,
            });

            if (data.externalParentId) {
              const variantsku = data.variantSku ? data.variantSku : data.images[0].label;
              // Set or Update Product Variant SKU
              setVariantSKU(variantsku);

              // To avoid on initial page load and execute only on variant change
              if (!pageLoadFlag) {
                // Load zoom viewers
                import('./gallery.js').then(({ loadZoomViewers }) => {
                  loadZoomViewers();
                });
              }
            }
          });
        },
      },
      // eslint-disable-next-line no-console
      onAddToCart: (values) => console.log('Added to cart', values),
      useACDL: true,
    })(block),
  ]);

  if (product) {
    trackViewedProduct(product.sku);
  }

  // Lifecycle Events
  events.on('pdp/valid', (valid) => {
    // update add to cart button disabled state based on product selection validity
    addToCart.setProps((prev) => ({ ...prev, disabled: !valid }));
  }, { eager: true });

  // Set JSON-LD and Meta Tags
  events.on(
    'eds/lcp',
    () => {
      if (product) {
        setJsonLdProduct(product);
        setMetaTags(product);
        document.title = product.name;
      }
    },
    { eager: true },
  );

  return Promise.resolve();
}

async function setJsonLdProduct(product) {
  const {
    name,
    inStock,
    description,
    sku,
    urlKey,
    price,
    priceRange,
    images,
    attributes,
  } = product;
  const amount = priceRange?.minimum?.final?.amount || price?.final?.amount;
  const brand = attributes.find((attr) => attr.name === 'brand');

  // get variants
  const { data } = await pdpApi.fetchGraphQl(`
    query GET_PRODUCT_VARIANTS($sku: String!) {
      variants(sku: $sku) {
        variants {
          product {
            sku
            name
            inStock
            images(roles: ["image"]) {
              url
            }
            ...on SimpleProductView {
              price {
                final { amount { currency value } }
              }
            }
          }
        }
      }
    }
  `, {
    method: 'GET',
    variables: { sku },
  });

  const variants = data?.variants?.variants || [];

  const ldJson = {
    '@context': 'http://schema.org',
    '@type': 'Product',
    name,
    description,
    image: images[0]?.url,
    offers: [],
    productID: sku,
    brand: {
      '@type': 'Brand',
      name: brand?.value,
    },
    url: new URL(`/products/${urlKey}/${sku}`, window.location),
    sku,
    '@id': new URL(`/products/${urlKey}/${sku}`, window.location),
  };

  if (variants.length > 1) {
    ldJson.offers.push(...variants.map((variant) => ({
      '@type': 'Offer',
      name: variant.product.name,
      image: variant.product.images[0]?.url,
      price: variant.product.price.final.amount.value,
      priceCurrency: variant.product.price.final.amount.currency,
      availability: variant.product.inStock ? 'http://schema.org/InStock' : 'http://schema.org/OutOfStock',
      sku: variant.product.sku,
    })));
  } else {
    ldJson.offers.push({
      '@type': 'Offer',
      price: amount?.value,
      priceCurrency: amount?.currency,
      availability: inStock ? 'http://schema.org/InStock' : 'http://schema.org/OutOfStock',
    });
  }

  setJsonLd(ldJson, 'product');
}

function createMetaTag(property, content, type) {
  if (!property || !type) {
    return;
  }
  let meta = document.head.querySelector(`meta[${type}="${property}"]`);
  if (meta) {
    if (!content) {
      meta.remove();
      return;
    }
    meta.setAttribute(type, property);
    meta.setAttribute('content', content);
    return;
  }
  if (!content) {
    return;
  }
  meta = document.createElement('meta');
  meta.setAttribute(type, property);
  meta.setAttribute('content', content);
  document.head.appendChild(meta);
}

function setMetaTags(product) {
  if (!product) {
    return;
  }

  const price = product.prices.final.minimumAmount ?? product.prices.final.amount;

  createMetaTag('title', product.metaTitle || product.name, 'name');
  createMetaTag('description', product.metaDescription, 'name');
  createMetaTag('keywords', product.metaKeyword, 'name');

  createMetaTag('og:type', 'product', 'property');
  createMetaTag('og:description', product.shortDescription, 'property');
  createMetaTag('og:title', product.metaTitle || product.name, 'property');
  createMetaTag('og:url', window.location.href, 'property');
  const mainImage = product?.images?.filter((image) => image.roles.includes('thumbnail'))[0];
  const metaImage = mainImage?.url || product?.images[0]?.url;
  createMetaTag('og:image', metaImage, 'property');
  createMetaTag('og:image:secure_url', metaImage, 'property');
  createMetaTag('product:price:amount', price.value, 'property');
  createMetaTag('product:price:currency', price.currency, 'property');
}
