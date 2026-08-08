// ===== QUOTE FORM - Multi-step wizard =====

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('quoteForm');
  if (!form) return;

  const API_BASE_URL = 'https://gloa-api.vercel.app';
  const totalSteps = 6;
  const rentalText = document.getElementById('rentalText');
  const rentalPreview = document.getElementById('rentalPreview');
  const addressInput = form.querySelector('[name="event_address"]');
  const distanceStatus = document.getElementById('deliveryDistanceStatus');
  const distanceMessage = document.getElementById('deliveryDistanceMessage');
  const submissionId = createSubmissionId();
  let currentStep = 1;
  let distanceTimer = null;
  let distanceRequestId = 0;
  let distanceState = { status: 'idle' };

  const formatLocalDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const today = new Date();
  const threeYearsFromToday = new Date(today.getFullYear() + 3, today.getMonth(), today.getDate());
  form.querySelectorAll('[name="delivery_date"], [name="retrieval_date"]').forEach((input) => {
    input.min = formatLocalDate(today);
    input.max = formatLocalDate(threeYearsFromToday);
  });

  function createSubmissionId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
      const random = window.crypto.getRandomValues(new Uint8Array(1))[0] & 15;
      const value = character === 'x' ? random : (random & 3) | 8;
      return value.toString(16);
    });
  }

  // --- Step Navigation ---
  function showStep(step) {
    form.querySelectorAll('.form-step').forEach((element) => element.classList.remove('active'));
    form.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');

    form.querySelectorAll('.step-dot').forEach((dot) => {
      const dotStep = Number.parseInt(dot.dataset.step, 10);
      dot.classList.remove('active', 'completed');
      if (dotStep === step) dot.classList.add('active');
      else if (dotStep < step) dot.classList.add('completed');
    });

    form.querySelectorAll('.step-dot.completed .dot').forEach((dot) => { dot.textContent = '\u2713'; });
    form.querySelectorAll('.step-dot:not(.completed) .dot').forEach((dot) => {
      dot.textContent = dot.closest('.step-dot').dataset.step;
    });

    currentStep = step;
    if (step === totalSteps) populateReview();
    window.scrollTo({ top: form.offsetTop - 100, behavior: 'smooth' });
  }

  form.querySelectorAll('.btn-next').forEach((button) => {
    button.addEventListener('click', () => {
      if (validateStep(currentStep)) showStep(currentStep + 1);
    });
  });

  form.querySelectorAll('.btn-prev').forEach((button) => {
    button.addEventListener('click', () => showStep(currentStep - 1));
  });

  // --- Validation ---
  function validateStep(step) {
    const stepElement = form.querySelector(`.form-step[data-step="${step}"]`);
    let valid = true;

    stepElement.querySelectorAll('[required]').forEach((input) => {
      const group = input.closest('.form-group') || input.closest('.checkbox-group')?.parentElement;
      if (!group) return;

      if (input.type === 'checkbox' && !input.checked) {
        group.classList.add('error');
        valid = false;
      } else if (input.type === 'radio') {
        const checked = stepElement.querySelector(`input[name="${input.name}"]:checked`);
        group.classList.toggle('error', !checked);
        if (!checked) valid = false;
      } else if (!input.value.trim()) {
        group.classList.add('error');
        valid = false;
      } else {
        group.classList.remove('error');
      }
    });

    const emailInput = stepElement.querySelector('input[type="email"]');
    if (emailInput && emailInput.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
      emailInput.closest('.form-group').classList.add('error');
      valid = false;
    }

    const phoneInput = stepElement.querySelector('input[name="phone"]');
    if (phoneInput && phoneInput.value && !/^[+()\-\.\s0-9]{7,40}$/.test(phoneInput.value)) {
      const phoneGroup = phoneInput.closest('.form-group');
      phoneGroup.classList.add('error');
      phoneGroup.querySelector('.error-msg').textContent = 'Please enter a phone number using digits only (no extensions or letters)';
      valid = false;
    }

    if (step === 2) {
      const textGroup = rentalText.closest('.form-group');
      const characters = getRentalCharacters(rentalText.value);
      const supported = /^[A-Z0-9&#?\s]+$/i.test(rentalText.value)
        && !(getStyle() === '2D' && characters.includes('#'));
      if (!supported || characters.length > 24) {
        textGroup.classList.add('error');
        textGroup.querySelector('.error-msg').textContent = supported
          ? 'Please limit your rental to 24 non-space characters'
          : 'Please use a character available in the selected style (2D hashtag is unavailable)';
        valid = false;
      }
    }

    if (step === 3) {
      const deliveryDate = valueOf('delivery_date');
      const deliveryTime = valueOf('delivery_time');
      const retrievalDate = valueOf('retrieval_date');
      const retrievalTime = valueOf('retrieval_time');
      if (deliveryDate && deliveryTime && retrievalDate && retrievalTime) {
        const delivery = new Date(`${deliveryDate}T${deliveryTime}`);
        const retrieval = new Date(`${retrievalDate}T${retrievalTime}`);
        if (delivery <= new Date()) {
          const dateGroup = form.querySelector('[name="delivery_date"]').closest('.form-group');
          const timeGroup = form.querySelector('[name="delivery_time"]').closest('.form-group');
          dateGroup.classList.add('error');
          timeGroup.classList.add('error');
          dateGroup.querySelector('.error-msg').textContent = 'Delivery date and time must be in the future';
          timeGroup.querySelector('.error-msg').textContent = 'Delivery date and time must be in the future';
          valid = false;
        }
        if (retrieval <= delivery) {
          const dateGroup = form.querySelector('[name="retrieval_date"]').closest('.form-group');
          const timeGroup = form.querySelector('[name="retrieval_time"]').closest('.form-group');
          dateGroup.classList.add('error');
          timeGroup.classList.add('error');
          dateGroup.querySelector('.error-msg').textContent = 'Retrieval must be after delivery date and time';
          timeGroup.querySelector('.error-msg').textContent = 'Retrieval must be after delivery date and time';
          valid = false;
        }
      }
    }

    return valid;
  }

  form.addEventListener('input', (event) => {
    const group = event.target.closest('.form-group');
    if (group) group.classList.remove('error');
  });
  form.addEventListener('change', (event) => {
    const group = event.target.closest('.form-group');
    if (group) group.classList.remove('error');
  });

  // --- Radio Cards ---
  form.querySelectorAll('.radio-card').forEach((card) => {
    card.addEventListener('click', () => {
      const input = card.querySelector('input[type="radio"]');
      const parent = card.closest('.form-group') || card.closest('.radio-cards').parentElement;
      parent.querySelectorAll('.radio-card').forEach((option) => option.classList.remove('selected'));
      card.classList.add('selected');
      input.checked = true;

      if (input.name === 'letter_style') updatePrice();
      if (input.name === 'delivery_method') handleDeliveryMethodChange();
    });
  });

  // --- Catalog-backed Pricing ---
  function getStyle() {
    return form.querySelector('input[name="letter_style"]:checked')?.value || '3D';
  }

  function getDeliveryMethod() {
    return form.querySelector('input[name="delivery_method"]:checked')?.value || 'Delivery';
  }

  function getRentalCharacters(text) {
    return [...text.toUpperCase()].filter((character) => !/\s/.test(character));
  }

  function characterPriceCents(style, character) {
    if (style === '2D') return 6000;
    return ['K', '?', '#'].includes(character.toUpperCase()) ? 9000 : 7500;
  }

  function rentalSubtotalCents() {
    const style = getStyle();
    return getRentalCharacters(rentalText.value).reduce(
      (total, character) => total + characterPriceCents(style, character),
      0
    );
  }

  function calculatePricing() {
    const deliveryMethod = getDeliveryMethod();
    const lettersSubtotalCents = rentalSubtotalCents();
    const deliveryComplete = deliveryMethod === 'Pickup' || distanceState.status === 'available';
    const deliveryCents = deliveryMethod === 'Pickup' ? 0 : (distanceState.data?.tier_price_cents || 0);
    const depositCents = deliveryMethod === 'Pickup' ? 10000 : 5000;

    if (!deliveryComplete) {
      return { complete: false, lettersSubtotalCents, deliveryCents: null, taxCents: null, cardFeeCents: null, depositCents, grandTotalCents: null };
    }

    const taxableCents = lettersSubtotalCents + deliveryCents;
    const taxCents = Math.round(taxableCents * 0.089);
    // Booqable charges the card fee on the pre-tax subtotal, not on subtotal + tax.
    const cardFeeCents = Math.round(taxableCents * 0.035);
    return {
      complete: true,
      lettersSubtotalCents,
      deliveryCents,
      taxCents,
      cardFeeCents,
      depositCents,
      grandTotalCents: taxableCents + taxCents + cardFeeCents + depositCents
    };
  }

  function money(cents) {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function updatePrice() {
    const text = rentalText.value.toUpperCase();
    const style = getStyle();
    const characters = getRentalCharacters(text);
    const subtotalCents = rentalSubtotalCents();
    document.getElementById('pricePerChar').textContent = style === '2D'
      ? '$60 per character'
      : '$75 per character; 3D K, ? and # are $90';

    if (characters.length > 0) {
      rentalPreview.style.display = 'block';
      document.getElementById('previewText').textContent = text;
      document.getElementById('charCount').textContent = characters.length;
      document.getElementById('styleLabel').textContent = style;
      document.getElementById('previewTotal').textContent = (subtotalCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      document.getElementById('previewPriceNote').textContent = style === '3D' && characters.some((character) => ['K', '?', '#'].includes(character))
        ? 'Includes Booqable pricing of $90.00 for each 3D K, question mark, and hashtag; other 3D characters are $75.00.'
        : 'Based on each character\'s current Booqable price; spaces are free.';
    } else {
      rentalPreview.style.display = 'none';
    }
    updateLivePricing();
  }

  rentalText.addEventListener('input', updatePrice);

  // --- Delivery Distance ---
  function handleDeliveryMethodChange() {
    distanceRequestId += 1;
    window.clearTimeout(distanceTimer);
    if (getDeliveryMethod() === 'Pickup') {
      distanceState = { status: 'pickup' };
      renderDistanceState();
    } else {
      scheduleDistanceLookup();
    }
  }

  function scheduleDistanceLookup() {
    window.clearTimeout(distanceTimer);
    const address = addressInput.value.trim();
    if (getDeliveryMethod() !== 'Delivery') return;
    if (address.length < 8) {
      distanceState = { status: 'idle' };
      renderDistanceState();
      return;
    }

    distanceState = { status: 'loading' };
    renderDistanceState();
    distanceTimer = window.setTimeout(() => lookupDistance(address), 650);
  }

  async function lookupDistance(address) {
    const requestId = ++distanceRequestId;
    try {
      const response = await fetch(`${API_BASE_URL}/api/distance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });
      const body = await response.json().catch(() => ({}));
      if (requestId !== distanceRequestId || address !== addressInput.value.trim()) return;

      if (response.ok && body.ok) {
        distanceState = body.out_of_range
          ? { status: 'out_of_range', data: body }
          : { status: 'available', data: body };
      } else if (body.error?.code === 'distance_service_unconfigured') {
        distanceState = { status: 'unavailable', message: body.error.message };
      } else {
        distanceState = {
          status: 'error',
          message: body.error?.message || 'We could not verify this address. Delivery pricing will be confirmed after submission.'
        };
      }
    } catch (error) {
      if (requestId !== distanceRequestId) return;
      distanceState = { status: 'unavailable', message: 'Live delivery pricing is temporarily unavailable and will be confirmed after submission.' };
    }
    renderDistanceState();
  }

  function renderDistanceState() {
    distanceStatus.className = `delivery-distance-status ${distanceState.status}`;
    switch (distanceState.status) {
      case 'pickup':
        distanceMessage.textContent = 'Pickup selected: no delivery mileage fee applies.';
        break;
      case 'loading':
        distanceMessage.textContent = 'Calculating round-trip driving distance and delivery fee...';
        break;
      case 'available': {
        const result = distanceState.data;
        distanceMessage.textContent = `${result.resolved_address} \u2022 ${result.round_trip_miles.toFixed(2)} round-trip miles \u2022 ${result.tier_name} \u2022 ${money(result.tier_price_cents)}`;
        break;
      }
      case 'out_of_range':
        distanceMessage.textContent = `This address is ${distanceState.data.round_trip_miles.toFixed(2)} round-trip miles away and is outside our 80-mile service area. Please choose pickup or call (404) 806-9959.`;
        break;
      case 'error':
      case 'unavailable':
        distanceMessage.textContent = `${distanceState.message} You can still continue and submit your request.`;
        break;
      default:
        distanceMessage.textContent = 'Enter the complete event address to calculate delivery.';
    }
    updateLivePricing();
  }

  addressInput.addEventListener('input', scheduleDistanceLookup);

  function deliveryDisplay(pricing) {
    if (getDeliveryMethod() === 'Pickup') return '$0.00';
    if (distanceState.status === 'out_of_range') return 'Outside service area';
    return pricing.complete ? money(pricing.deliveryCents) : 'To be confirmed';
  }

  function updateLivePricing() {
    const pricing = calculatePricing();
    document.getElementById('liveSubtotal').textContent = money(pricing.lettersSubtotalCents);
    document.getElementById('liveDelivery').textContent = deliveryDisplay(pricing);
    document.getElementById('liveTax').textContent = pricing.complete ? money(pricing.taxCents) : 'To be confirmed';
    document.getElementById('liveCCFee').textContent = pricing.complete ? money(pricing.cardFeeCents) : 'To be confirmed';
    document.getElementById('liveDeposit').textContent = money(pricing.depositCents);
    document.getElementById('liveGrandTotal').textContent = pricing.complete ? money(pricing.grandTotalCents) : 'To be confirmed';
  }

  // --- Review and Formspree Summary ---
  function valueOf(name) {
    return form.querySelector(`[name="${name}"]`)?.value || '';
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  function formatTime(timeString) {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = Number.parseInt(hours, 10);
    return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'PM' : 'AM'}`;
  }

  function distanceReview() {
    if (getDeliveryMethod() === 'Pickup') return { resolved: 'Not applicable for pickup', mileage: 'Not applicable', tier: 'No delivery fee' };
    if (distanceState.status === 'available') {
      return {
        resolved: distanceState.data.resolved_address,
        mileage: `${distanceState.data.round_trip_miles.toFixed(2)} miles round trip`,
        tier: distanceState.data.tier_name
      };
    }
    if (distanceState.status === 'out_of_range') {
      return {
        resolved: distanceState.data.resolved_address,
        mileage: `${distanceState.data.round_trip_miles.toFixed(2)} miles round trip`,
        tier: 'Outside 80-mile service area - please call (404) 806-9959'
      };
    }
    return { resolved: 'To be confirmed', mileage: 'To be confirmed', tier: 'To be confirmed' };
  }

  function populateReview() {
    const style = getStyle();
    const text = valueOf('rental_text').toUpperCase();
    const characters = getRentalCharacters(text);
    const deliveryMethod = getDeliveryMethod();
    const pricing = calculatePricing();
    const distance = distanceReview();
    const setup = form.querySelector('input[name="setup_location"]:checked')?.value || '';

    document.getElementById('revName').textContent = `${valueOf('first_name')} ${valueOf('last_name')}`;
    document.getElementById('revEmail').textContent = valueOf('email');
    document.getElementById('revPhone').textContent = valueOf('phone');
    document.getElementById('revInstagram').textContent = valueOf('instagram') || 'N/A';
    document.getElementById('revStyle').textContent = `${style} Letters`;
    document.getElementById('revLetters').textContent = text;
    document.getElementById('revPricePerChar').textContent = style === '2D' ? '$60.00 each' : '$75.00 each; 3D K, ? and # are $90.00';
    document.getElementById('revCharCount').textContent = characters.length;
    document.getElementById('revEventDateTime').textContent = `${formatDate(valueOf('event_date'))} at ${formatTime(valueOf('event_time'))}`;
    document.getElementById('revVenue').textContent = valueOf('venue_name');
    document.getElementById('revAddress').textContent = valueOf('event_address');
    document.getElementById('revContact').textContent = valueOf('onsite_contact');
    document.getElementById('revInstructions').textContent = valueOf('special_instructions') || 'None';
    document.getElementById('revSetup').textContent = `${setup} Event`;
    document.getElementById('revDeliveryMethod').textContent = deliveryMethod;
    document.getElementById('revResolvedAddress').textContent = distance.resolved;
    document.getElementById('revMileage').textContent = distance.mileage;
    document.getElementById('revDeliveryTier').textContent = distance.tier;
    document.getElementById('revDeliveryDateTime').textContent = `${formatDate(valueOf('delivery_date'))} at ${formatTime(valueOf('delivery_time'))}`;
    document.getElementById('revRetrievalDateTime').textContent = `${formatDate(valueOf('retrieval_date'))} at ${formatTime(valueOf('retrieval_time'))}`;
    document.getElementById('revEstTotal').textContent = money(pricing.lettersSubtotalCents);
    document.getElementById('revDeliveryFee').textContent = deliveryDisplay(pricing);
    document.getElementById('revTax').textContent = pricing.complete ? money(pricing.taxCents) : 'To be confirmed';
    document.getElementById('revCCFee').textContent = pricing.complete ? money(pricing.cardFeeCents) : 'To be confirmed';
    document.getElementById('revDeposit').textContent = `${money(pricing.depositCents)} (returned after event)`;
    document.getElementById('revGrandTotal').textContent = pricing.complete ? money(pricing.grandTotalCents) : 'To be confirmed';

    const summaryValue = (cents) => cents === null ? 'To be confirmed' : money(cents);
    const summary = `
RENTAL REQUEST SUMMARY
======================
Name: ${valueOf('first_name')} ${valueOf('last_name')}
Email: ${valueOf('email')}
Phone: ${valueOf('phone')}
Instagram: ${valueOf('instagram') || 'N/A'}

RENTAL: ${style} Letters
Text: ${text}
Characters: ${characters.length}
Rental Subtotal: ${money(pricing.lettersSubtotalCents)}
Character Pricing: ${style === '2D' ? '$60.00 each' : '$75.00 each; 3D K, ? and # are $90.00'}

EVENT: ${formatDate(valueOf('event_date'))} at ${formatTime(valueOf('event_time'))}
Venue: ${valueOf('venue_name')}
Submitted Address: ${valueOf('event_address')}
Resolved Address: ${distance.resolved}
Onsite Contact: ${valueOf('onsite_contact')}
Special Instructions: ${valueOf('special_instructions') || 'None'}

SETUP: ${setup} Event
DELIVERY METHOD: ${deliveryMethod}
Delivery / Pickup: ${formatDate(valueOf('delivery_date'))} at ${formatTime(valueOf('delivery_time'))}
Retrieval / Return: ${formatDate(valueOf('retrieval_date'))} at ${formatTime(valueOf('retrieval_time'))}
Round-Trip Mileage: ${distance.mileage}
Delivery Tier: ${distance.tier}
Delivery Fee: ${deliveryDisplay(pricing)}

*** THIS IS AN ESTIMATE ONLY - NOT A FINAL PRICE ***

Rental Subtotal: ${money(pricing.lettersSubtotalCents)}
Delivery Fee: ${deliveryDisplay(pricing)}
Est. Tax (8.9%): ${summaryValue(pricing.taxCents)}
Est. CC Fee (3.5% of subtotal + delivery; excludes tax and deposit): ${summaryValue(pricing.cardFeeCents)}
Refundable Deposit: ${money(pricing.depositCents)} (${deliveryMethod})
ESTIMATED TOTAL: ${summaryValue(pricing.grandTotalCents)}

NOTE: Availability and submitted details will be reviewed. An invoice with a secure payment link will be sent for confirmation.
    `.trim();
    document.getElementById('orderSummary').value = summary;
  }

  function toIso(dateName, timeName) {
    return new Date(`${valueOf(dateName)}T${valueOf(timeName)}`).toISOString();
  }

  function buildQuotePayload() {
    return {
      submission_id: submissionId,
      first_name: valueOf('first_name'),
      last_name: valueOf('last_name'),
      email: valueOf('email'),
      phone: valueOf('phone'),
      instagram: valueOf('instagram'),
      rental_text: valueOf('rental_text'),
      letter_style: getStyle(),
      delivery_method: getDeliveryMethod(),
      starts_at: toIso('delivery_date', 'delivery_time'),
      stops_at: toIso('retrieval_date', 'retrieval_time'),
      event_date: valueOf('event_date'),
      event_time: valueOf('event_time'),
      event_address: valueOf('event_address'),
      venue_name: valueOf('venue_name'),
      onsite_contact: valueOf('onsite_contact'),
      setup_location: form.querySelector('input[name="setup_location"]:checked')?.value || '',
      special_instructions: valueOf('special_instructions')
    };
  }

  async function createBooqableDraft() {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${API_BASE_URL}/api/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildQuotePayload()),
        signal: controller.signal
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.warn('Booqable draft was not created:', body.error?.code || response.status, body.error?.message || 'Unknown error');
        return;
      }
      console.info('Booqable draft created:', body.order_number || body.order_id, 'shortage:', Boolean(body.shortage));
    } catch (error) {
      console.warn('Booqable draft was not created:', error.name === 'AbortError' ? 'request timed out' : error.message);
    } finally {
      window.clearTimeout(timeout);
    }
  }

  // Formspree remains the customer-facing source of truth. A Booqable failure
  // is logged for diagnosis but never turns a successful Formspree submission
  // into a customer-visible failure.
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    populateReview();

    let subject = form.querySelector('input[name="_subject"]');
    if (!subject) {
      subject = document.createElement('input');
      subject.type = 'hidden';
      subject.name = '_subject';
      form.appendChild(subject);
    }
    subject.value = `New Rental Request from ${valueOf('first_name')} ${valueOf('last_name')}`;

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`Formspree HTTP ${response.status}`);

      await createBooqableDraft();
      window.location.href = 'thank-you.html';
    } catch (error) {
      alert('There was a problem submitting your request. Please try again or call us at (404) 806-9959.');
      submitButton.disabled = false;
      submitButton.textContent = 'Submit Order';
    }
  });

  // Do not allow past dates in the remaining date pickers.
  form.querySelectorAll('input[type="date"]').forEach((input) => { input.min = formatLocalDate(today); });
  updatePrice();
  renderDistanceState();
});
