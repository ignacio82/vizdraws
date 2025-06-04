test_that("normal and std_normal parsing", {
  std_vec <- vizdraws:::parse_prior("std_normal")
  norm_vec <- vizdraws:::parse_prior("normal(0,1)")
  expect_equal(norm_vec, qnorm(1:1000/1001))
  expect_identical(std_vec, norm_vec)
  expect_length(norm_vec, 1000)
})

test_that("Student-t parsing", {
  t_vec <- vizdraws:::parse_prior("student_t(0,1,3)")
  expect_equal(t_vec, qt(1:1000/1001, df = 3))
  expect_identical(t_vec, vizdraws:::parse_prior("t(0,1,3)"))
  expect_length(t_vec, 1000)
})
