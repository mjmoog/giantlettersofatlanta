// ===== QUOTE FORM - Multi-step wizard =====

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('quoteForm');
  if (!form) return;

  let currentStep = 1;
  const totalSteps = 6;

  // --- Step Navigation ---
  function showStep(step) {
    document.querySelectorAll('.form-step').forEach(el => el.classList.remove('active'));
    document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');

    document.querySelectorAll('.step-dot').forEach(dot => {
      const s = parseInt(dot.dataset.step);
      dot.classList.remove('active', 'completed');
      if (s === step) dot.classList.add('active');
      else if (s < step) dot.classList.add('completed');
    });

    // Update completed dots to show checkmark
    document.querySelectorAll('.step-dot.completed .dot').forEach(dot => {
      dot.textContent = '\u2713';
    });
    document.querySelectorAll('.step-dot:not(.completed) .dot').forEach(dot => {
      dot.textContent = dot.closest('.step-dot').dataset.step;
    });

    window.scrollTo({ top: document.querySelector('.form-wizard').offsetTop - 100, behavior: 'smooth' });
    currentStep = step;
  }

  // Next buttons
  form.querySelectorAll('.btn-next').forEach(btn => {
    btn.addEventListener('click', () => {
      if (validateStep(currentStep)) {
        if (currentStep === 5) populateReview();
        showStep(currentStep + 1);
      }
    });
  });

  // Back buttons
  form.querySelectorAll('.btn-prev').forEach(btn => {
    btn.addEventListener('click', () => {
      showStep(currentStep - 1);
    });
  });

  // --- Validation ---
  function validateStep(step) {
    const stepEl = document.querySelector(`.form-step[data-step="${step}"]`);
    const required = stepEl.querySelectorAll('[required]');
    let valid = true;

    required.forEach(input => {
      const group = input.closest('.form-group') || input.closest('.checkbox-group')?.parentElement;
      if (!group) return;

      if (input.type === 'checkbox' && !input.checked) {
        group.classList.add('error');
        valid = false;
      } else if (input.type === 'radio') {
        const name = input.name;
        const checked = stepEl.querySelector(`input[name="${name}"]:checked`);
        if (!checked) {
          group.classList.add('error');
          valid = false;
        } else {
          group.classList.remove('error');
        }
      } else if (!input.value.trim()) {
        group.classList.add('error');
        valid = false;
      } else {
        group.classList.remove('error');
      }
    });

    // Email validation
    const emailInput = stepEl.querySelector('input[type="email"]');
    if (emailInput && emailInput.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value)) {
      emailInput.closest('.form-group').classList.add('error');
      valid = false;
    }

    // Retrieval must be after delivery (step 5)
    if (step === 5) {
      const dDate = form.querySelector('[name="delivery_date"]').value;
      const dTime = form.querySelector('[name="delivery_time"]').value;
      const rDate = form.querySelector('[name="retrieval_date"]').value;
      const rTime = form.querySelector('[name="retrieval_time"]').value;

      if (dDate && dTime && rDate && rTime) {
        const delivery = new Date(dDate + 'T' + dTime);
        const retrieval = new Date(rDate + 'T' + rTime);
        if (retrieval <= delivery) {
          const rDateGroup = form.querySelector('[name="retrieval_date"]').closest('.form-group');
          const rTimeGroup = form.querySelector('[name="retrieval_time"]').closest('.form-group');
          rDateGroup.classList.add('error');
          rTimeGroup.classList.add('error');
          rDateGroup.querySelector('.error-msg').textContent = 'Retrieval must be after delivery date & time';
          rTimeGroup.querySelector('.error-msg').textContent = 'Retrieval must be after delivery date & time';
          valid = false;
        }
      }
    }

    return valid;
  }

  // Clear error on input
  form.addEventListener('input', (e) => {
    const group = e.target.closest('.form-group');
    if (group) group.classList.remove('error');
  });

  form.addEventListener('change', (e) => {
    const group = e.target.closest('.form-group');
    if (group) group.classList.remove('error');
  });

  // --- Radio Card Selection ---
  form.querySelectorAll('.radio-card').forEach(card => {
    card.addEventListener('click', () => {
      const parent = card.closest('.form-group') || card.closest('.radio-cards').parentElement;
      parent.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      card.querySelector('input[type="radio"]').checked = true;

      // Update price if this is the letter style selector
      if (card.dataset.price) {
        updatePrice();
      }
    });
  });

  // --- Live Price Calculator ---
  const rentalText = document.getElementById('rentalText');
  const rentalPreview = document.getElementById('rentalPreview');

  if (rentalText) {
    rentalText.addEventListener('input', updatePrice);
  }

  function getPrice() {
    const selected = form.querySelector('input[name="letter_style"]:checked');
    return selected && selected.value === '2D' ? 60 : 75;
  }

  function getStyle() {
    const selected = form.querySelector('input[name="letter_style"]:checked');
    return selected ? selected.value : '3D';
  }

  function countChars(text) {
    // Count non-space characters
    return text.replace(/\s/g, '').length;
  }

  function updatePrice() {
    const text = rentalText ? rentalText.value.toUpperCase() : '';
    const price = getPrice();
    const style = getStyle();
    const chars = countChars(text);
    const total = chars * price;

    // Update hints
    const pricePerCharEl = document.getElementById('pricePerChar');
    if (pricePerCharEl) pricePerCharEl.textContent = price;

    // Update preview
    if (rentalPreview) {
      if (chars > 0) {
        rentalPreview.style.display = 'block';
        document.getElementById('previewText').textContent = text;
        document.getElementById('charCount').textContent = chars;
        document.getElementById('styleLabel').textContent = style;
        document.getElementById('previewPricePerChar').textContent = price;
        document.getElementById('previewTotal').textContent = total.toLocaleString();
      } else {
        rentalPreview.style.display = 'none';
      }
    }
  }

  // --- Populate Review ---
  function populateReview() {
    const val = (name) => {
      const el = form.querySelector(`[name="${name}"]`);
      return el ? el.value : '';
    };

    document.getElementById('revName').textContent = val('first_name') + ' ' + val('last_name');
    document.getElementById('revEmail').textContent = val('email');
    document.getElementById('revPhone').textContent = val('phone');
    document.getElementById('revInstagram').textContent = val('instagram') || 'N/A';

    const style = getStyle();
    const price = getPrice();
    const text = val('rental_text').toUpperCase();
    const chars = countChars(text);
    const subtotal = chars * price;

    document.getElementById('revStyle').textContent = style + ' Letters';
    document.getElementById('revLetters').textContent = text;
    document.getElementById('revPricePerChar').textContent = '$' + price;
    document.getElementById('revCharCount').textContent = chars;

    // Format dates
    const fmtDate = (dateStr) => {
      if (!dateStr) return '';
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    };
    const fmtTime = (timeStr) => {
      if (!timeStr) return '';
      const [h, m] = timeStr.split(':');
      const hr = parseInt(h);
      const ampm = hr >= 12 ? 'PM' : 'AM';
      const hr12 = hr % 12 || 12;
      return hr12 + ':' + m + ' ' + ampm;
    };

    document.getElementById('revEventDateTime').textContent =
      fmtDate(val('event_date')) + ' at ' + fmtTime(val('event_time'));
    document.getElementById('revVenue').textContent = val('venue_name');
    document.getElementById('revAddress').textContent = val('event_address');
    document.getElementById('revContact').textContent = val('onsite_contact');
    document.getElementById('revInstructions').textContent = val('special_instructions') || 'None';

    const setupEl = form.querySelector('input[name="setup_location"]:checked');
    document.getElementById('revSetup').textContent = setupEl ? setupEl.value + ' Event' : '';

    const deliveryEl = form.querySelector('input[name="delivery_method"]:checked');
    document.getElementById('revDeliveryMethod').textContent = deliveryEl ? deliveryEl.value : '';

    document.getElementById('revDeliveryDateTime').textContent =
      fmtDate(val('delivery_date')) + ' at ' + fmtTime(val('delivery_time'));
    document.getElementById('revRetrievalDateTime').textContent =
      fmtDate(val('retrieval_date')) + ' at ' + fmtTime(val('retrieval_time'));

    const deposit = deliveryEl && deliveryEl.value === 'Pickup' ? 100 : 50;
    const tax = Math.round(subtotal * 0.07 * 100) / 100;
    const ccFee = Math.round((subtotal + tax + deposit) * 0.035 * 100) / 100;
    const grandTotal2 = subtotal + tax + ccFee + deposit;

    document.getElementById('revEstTotal').textContent = '$' + subtotal.toLocaleString();
    document.getElementById('revTax').textContent = '$' + tax.toFixed(2);
    document.getElementById('revCCFee').textContent = '$' + ccFee.toFixed(2);
    document.getElementById('revDeposit').textContent = '$' + deposit.toFixed(2) + ' (returned after event)';
    document.getElementById('revGrandTotal').textContent = '$' + grandTotal2.toFixed(2);

    // Build a summary for the hidden field (so the email is readable)
    const summary = `
RENTAL REQUEST SUMMARY
======================
Name: ${val('first_name')} ${val('last_name')}
Email: ${val('email')}
Phone: ${val('phone')}
Instagram: ${val('instagram') || 'N/A'}

RENTAL: ${style} Letters
Text: ${text}
Characters: ${chars} x $${price} = $${subtotal}

EVENT: ${fmtDate(val('event_date'))} at ${fmtTime(val('event_time'))}
Venue: ${val('venue_name')}
Address: ${val('event_address')}
Onsite Contact: ${val('onsite_contact')}
Special Instructions: ${val('special_instructions') || 'None'}

SETUP: ${setupEl ? setupEl.value : ''} Event
DELIVERY: ${deliveryEl ? deliveryEl.value : ''}
Delivery: ${fmtDate(val('delivery_date'))} at ${fmtTime(val('delivery_time'))}
Retrieval: ${fmtDate(val('retrieval_date'))} at ${fmtTime(val('retrieval_time'))}

*** THIS IS AN ESTIMATE ONLY - NOT A FINAL PRICE ***

Rental Subtotal: $${subtotal}
Est. Tax (7%): $${tax.toFixed(2)}
Est. CC Fee (3.5%): $${ccFee.toFixed(2)}
Refundable Deposit: $${deposit} (${deliveryEl && deliveryEl.value === 'Pickup' ? 'Pickup' : 'Delivery'})
ESTIMATED TOTAL: $${grandTotal2.toFixed(2)}

NOTE: Final price may vary. Invoice with payment link will be sent for confirmation.
    `.trim();

    document.getElementById('orderSummary').value = summary;
  }

  // --- Form Submit ---
  form.addEventListener('submit', (e) => {
    // Add email subject line
    let subject = form.querySelector('input[name="_subject"]');
    if (!subject) {
      subject = document.createElement('input');
      subject.type = 'hidden';
      subject.name = '_subject';
      const name = form.querySelector('[name="first_name"]').value + ' ' + form.querySelector('[name="last_name"]').value;
      subject.value = 'New Rental Request from ' + name;
      form.appendChild(subject);
    }
  });
});
