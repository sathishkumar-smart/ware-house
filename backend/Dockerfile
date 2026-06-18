FROM python:3.12

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev

COPY requirements.txt .

RUN pip install --upgrade pip
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

# CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

CMD ["sh", "-c", "until python manage.py migrate; do echo 'Database unavailable - retrying in 3 seconds'; sleep 3; done; exec python manage.py runserver 0.0.0.0:8000"]
