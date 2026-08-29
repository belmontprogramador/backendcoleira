# Modelo de Dados

## 1. User

```text
User
----
id
name
email
password_hash
phone
status
email_verified_at
created_at
updated_at
```

---

## 2. Pet

```text
Pet
---
id
owner_id
name
species
breed
sex
birth_date
photo_url
description
lost_status
created_at
updated_at
deleted_at
```

---

## 3. NfcTag

```text
NfcTag
------
id
public_id
uid
activation_code_hash
status
owner_id
pet_id
activated_at
deactivated_at
created_at
updated_at
```

Constraints:

```text
public_id UNIQUE
uid UNIQUE
```

---

## 4. PetPrivacy

```text
PetPrivacy
----------
pet_id
show_phone
show_email
show_city
show_medical
show_veterinarian
show_behavior
show_contacts
```

---

## 5. PetMedical

```text
PetMedical
------------
pet_id
allergies
medications
special_care
medical_conditions
veterinarian_name
veterinarian_phone
```

---

## 6. PetContact

```text
PetContact
-----------
id
pet_id
name
phone
email
relationship
is_primary
```

---

## 7. Feature / PlanFeature

```text
Feature
---------
id
code
name
```

```text
Plan
 ↓
PlanFeature
 ↓
Feature
```

---

## 8. Subscription

```text
Subscription
-------------
id
user_id
plan_id
provider
provider_customer_id
provider_subscription_id
status
started_at
current_period_start
current_period_end
cancelled_at
created_at
updated_at
```

---

## 9. WebhookEvent

```text
WebhookEvent
------------
id
provider
event_id
event_type
processed
received_at
processed_at
```

---

## 10. AccessEvent

```text
AccessEvent
------------
id
pet_id
nfc_tag_id
source
timestamp
device_type
ip_hash
location_approx
```

---

## 11. AuditLog

```text
AuditLog
--------
id
user_id
action
entity
entity_id
metadata
ip_hash
created_at
```

Registrar:

- ativação;
- login;
- transferência;
- alteração;
- exclusão;
- assinatura;
- alteração de privacidade;
- operações administrativas.

---

## 12. InventoryItem

```text
InventoryItem
-------------
id
nfc_tag_id
batch_id
status
location
```

Status:

```text
IN_STOCK
RESERVED
SOLD
SHIPPED
DELIVERED
RETURNED
DAMAGED
```

---

## 13. Order

```text
Order
------
id
user_id
status
subtotal
discount
shipping
total
payment_status
created_at
```

Itens:

```text
OrderItem
---------
order_id
nfc_tag_id
quantity
unit_price
```
